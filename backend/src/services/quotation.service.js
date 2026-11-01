const fs = require('fs');
const path = require('path');
const Quotation = require('../models/Quotation');
const Company = require('../models/Company');
const Product = require('../models/Product');
const Term = require('../models/Term');
const CompanyEmployee = require('../models/CompanyEmployee');
const Counter = require('../models/Counter');
const EmailTemplate = require('../models/EmailTemplate');
const Market = require('../models/Market');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { toFileMeta, deleteStoredFile } = require('../utils/file');
const { calcLine, round2 } = require('../utils/quotationCalc');
const { renderQuotationPdf } = require('./quotationPdf.service');
const { sendMail } = require('./mail.service');
const { renderTemplate, escapeHtml } = require('../utils/template');
const { sanitizeEmailHtml, htmlToText, wrapEmailHtml } = require('../utils/emailHtml');
const { buildPricingTableHtml, buildPricingTableText } = require('../utils/pricingTable');
const { BUILT_IN_TEMPLATE, EMAIL_FORMAT } = require('../config/emailVariables');
const { UPLOAD_ROOT, UPLOAD_DIRS } = require('../config/upload');
const { GST_MODE, DEFAULT_GST_RATE, PRODUCT_STATUS, QUOTATION_STATUS, ROLES, RSP_GST } = require('../config/constants');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const currentMonth = () => new Date().toISOString().slice(0, 7);

const monthTitle = (rateMonth) => {
  const [y, m] = rateMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

const companySnapshotOf = (company) => ({
  name: company.name,
  address: company.address,
  email: company.email,
  phone: company.phone,
  gstNumber: company.gstNumber,
});

/* ------------------------------------------------------------------ */
/* Market RSP attachment                                               */
/* ------------------------------------------------------------------ */

const RSP_IMAGE_FIELD = { [RSP_GST.WITH]: 'ratesWithGst', [RSP_GST.WITHOUT]: 'ratesWithoutGst' };

// e.g. "RSP - Bhiwadi Market - With GST - November 2026.jpg"
const rspFileName = (rsp) => {
  const gst = rsp.gst === RSP_GST.WITH ? 'With GST' : 'Without GST';
  const month = rsp.ratesMonth ? ` - ${monthTitle(rsp.ratesMonth)}` : '';
  const ext = path.extname(rsp.file.fileName || rsp.file.path) || '.jpg';
  const title = rsp.marketTitle.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  return `RSP - ${title} - ${gst}${month}${ext}`;
};

/**
 * The market rate image chosen in the wizard (payload.rsp = { marketId, gst }), or undefined.
 * `file` still points at the market's image here; createQuotation stores a copy.
 */
const buildRspAttachment = async (rsp) => {
  if (!rsp?.marketId) return undefined;
  if (!RSP_IMAGE_FIELD[rsp.gst]) throw ApiError.badRequest('Choose the RSP rates with GST or without GST');
  const market = await Market.findById(rsp.marketId);
  if (!market) throw ApiError.badRequest('Selected market was not found');
  const file = market[RSP_IMAGE_FIELD[rsp.gst]];
  if (!file?.path) {
    throw ApiError.badRequest(
      `${market.title} has no rates image ${rsp.gst === RSP_GST.WITH ? 'with' : 'without'} GST. Upload it under Markets first.`
    );
  }
  return {
    market: market._id,
    marketTitle: market.title,
    gst: rsp.gst,
    ratesMonth: market.ratesMonth,
    file: file.toObject ? file.toObject() : file,
  };
};

// Copy the market image into the quotations folder so the quotation keeps it after monthly updates
const copyRspImage = async (rsp, quotationNumber) => {
  const ext = path.extname(rsp.file.path) || '.jpg';
  const fileName = `${quotationNumber}-rsp${ext}`;
  const dest = path.join(UPLOAD_ROOT, UPLOAD_DIRS.QUOTATIONS, fileName);
  const src = path.resolve(UPLOAD_ROOT, rsp.file.path);
  try {
    await fs.promises.copyFile(src, dest);
  } catch {
    throw ApiError.badRequest(`The ${rsp.marketTitle} rates image is missing on the server. Upload it again under Markets.`);
  }
  const { size } = await fs.promises.stat(dest);
  return toFileMeta({ path: dest, filename: fileName, originalname: rspFileName(rsp), mimetype: rsp.file.mimeType, size });
};

/**
 * Turn the full wizard payload into quotation data: loads and checks every referenced record,
 * snapshots them and calculates all prices on the server.
 */
const buildQuotationData = async (payload) => {
  const company = await Company.findById(payload.companyId);
  if (!company) throw ApiError.badRequest('Selected company was not found');

  // Products, in the order they were added
  const productIds = payload.items.map((i) => String(i.productId));
  if (new Set(productIds).size !== productIds.length) throw ApiError.badRequest('The same product was added twice');
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const gstMode = payload.gstMode || GST_MODE.EXCLUDED;
  const gstRate = payload.gstRate ?? DEFAULT_GST_RATE;

  const items = payload.items.map((line, idx) => {
    const product = productMap.get(String(line.productId));
    if (!product) throw ApiError.badRequest(`Product #${idx + 1} was not found`);
    if (product.status !== PRODUCT_STATUS.ACTIVE) throw ApiError.badRequest(`${product.name} is inactive`);

    const basicPrice = line.basicPrice ?? product.currentPrice;
    const discount = line.discount ?? 0;
    if (discount > basicPrice) throw ApiError.badRequest(`${product.name}: discount cannot be more than the basic price`);
    const securityAmount = round2(line.securityAmount ?? product.securityAmount ?? 0);

    return {
      product: product._id,
      name: product.name,
      gasType: product.gasType,
      unit: product.unit,
      capacityKg: product.cylinderCapacityKg,
      ...calcLine({ basicPrice, discount, capacityKg: product.cylinderCapacityKg }, gstMode, gstRate),
      securityAmount,
    };
  });

  // Selected terms points: terms in the order they were selected, points in the term's own order
  const termSelections = (payload.terms || []).filter((s) => s.points?.length);
  const termIds = termSelections.map((s) => String(s.termId));
  if (new Set(termIds).size !== termIds.length) throw ApiError.badRequest('The same terms were selected twice');
  const termDocs = await Term.find({ _id: { $in: termIds } });
  const termMap = new Map(termDocs.map((t) => [String(t._id), t]));
  const terms = termSelections.map((s) => {
    const t = termMap.get(String(s.termId));
    if (!t) throw ApiError.badRequest('A selected Terms & Conditions entry was not found');
    const wanted = new Set(s.points);
    const points = t.points.filter((p) => wanted.has(p));
    if (points.length !== wanted.size) {
      throw ApiError.badRequest(`"${t.heading}" has been edited since its points were selected. Please select them again.`);
    }
    return { term: t._id, heading: t.heading, points };
  });

  // Recipients must be employees of the selected company
  const recipientIds = [...new Set((payload.recipientIds || []).map(String))];
  const employees = await CompanyEmployee.find({ _id: { $in: recipientIds }, company: company._id });
  if (employees.length !== recipientIds.length) {
    throw ApiError.badRequest('Every selected employee must belong to the selected company');
  }
  const empMap = new Map(employees.map((e) => [String(e._id), e]));
  const recipients = recipientIds.map((id) => {
    const e = empMap.get(id);
    return { employee: e._id, name: e.name, email: e.email, designation: e.designation };
  });

  if (!payload.emailTemplateId) throw ApiError.badRequest('Select an email template');
  if (!(await EmailTemplate.exists({ _id: payload.emailTemplateId }))) {
    throw ApiError.badRequest('Selected email template was not found');
  }

  const rspAttachment = await buildRspAttachment(payload.rsp);

  return {
    company: company._id,
    companySnapshot: companySnapshotOf(company),
    rateMonth: payload.rateMonth || currentMonth(),
    basicLabel: payload.basicLabel || 'BASIC BY IOCL',
    items,
    gstMode,
    gstRate,
    securityDeposit: round2(items.reduce((sum, i) => sum + i.securityAmount, 0)),
    terms,
    emailTemplate: payload.emailTemplateId || undefined,
    recipients,
    rspAttachment,
  };
};

const previewPdf = async (payload) => {
  const data = await buildQuotationData(payload);
  return renderQuotationPdf({ ...data, quotationNumber: 'PREVIEW', createdAt: new Date() });
};

const formatQuotationNumber = (year, seq) => `QT-${year}-${String(seq).padStart(4, '0')}`;

const nextQuotationNumber = async () => {
  const year = new Date().getFullYear();
  const seq = await Counter.next(`quotation-${year}`);
  return formatQuotationNumber(year, seq);
};

// The number the next quotation will most likely get (read-only; the real one is assigned on save)
const peekNextQuotationNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findById(`quotation-${year}`);
  return formatQuotationNumber(year, (counter?.seq || 0) + 1);
};

const getQuotationById = async (id) => {
  const q = await Quotation.findById(id)
    .populate('createdBy', 'name')
    .populate('emails.sentBy', 'name')
    .populate('emails.template', 'name')
    .populate('emailTemplate', 'name')
    .populate('draft.emailTemplate', 'name')
    // Drafts: return the referenced records so the wizard can be resumed
    .populate('draft.items.product')
    .populate('draft.terms', 'points') // older drafts selected whole terms
    .populate('draft.recipients')
    .populate('draft.rsp.market', 'title ratesMonth ratesWithGst ratesWithoutGst');
  if (!q) throw ApiError.notFound('Quotation not found');
  return q;
};

/* ------------------------------------------------------------------ */
/* Drafts                                                              */
/* ------------------------------------------------------------------ */

const toDraft = (payload) => ({
  items: (payload.items || []).map((i) => ({
    product: i.productId,
    basicPrice: i.basicPrice ?? undefined,
    discount: i.discount ?? undefined,
    securityAmount: i.securityAmount ?? undefined,
  })),
  rateMonth: payload.rateMonth || undefined,
  basicLabel: payload.basicLabel ?? undefined,
  gstMode: payload.gstMode || undefined,
  gstRate: payload.gstRate ?? undefined,
  terms: [],
  termPoints: (payload.terms || []).map((s) => ({ term: s.termId, points: s.points || [] })),
  recipients: payload.recipientIds || [],
  emailTemplate: payload.emailTemplateId || undefined,
  rsp: payload.rsp?.marketId ? { market: payload.rsp.marketId, gst: payload.rsp.gst || undefined } : undefined,
  step: payload.step ?? 0,
});

const saveDraft = async (payload, adminId, draftId) => {
  const company = await Company.findById(payload.companyId);
  if (!company) throw ApiError.badRequest('Selected company was not found');

  let q;
  if (draftId) {
    q = await Quotation.findById(draftId);
    if (!q) throw ApiError.notFound('Draft not found');
    if (q.status !== QUOTATION_STATUS.DRAFT) throw ApiError.badRequest('Only drafts can be edited');
  } else {
    q = new Quotation({ status: QUOTATION_STATUS.DRAFT, createdBy: adminId });
  }

  q.company = company._id;
  q.companySnapshot = companySnapshotOf(company);
  q.draft = toDraft(payload);
  q.updatedBy = adminId;
  await q.save();
  return getQuotationById(q._id);
};

/* ------------------------------------------------------------------ */
/* Complete (generate number + PDF)                                    */
/* ------------------------------------------------------------------ */

const createQuotation = async (payload, adminId) => {
  // Completing an existing draft keeps its id; otherwise a new quotation is created
  let q;
  if (payload.draftId) {
    q = await Quotation.findById(payload.draftId);
    if (!q) throw ApiError.notFound('Draft not found');
    if (q.status !== QUOTATION_STATUS.DRAFT) throw ApiError.badRequest('This quotation has already been completed');
  } else {
    q = new Quotation({ createdBy: adminId });
  }

  const data = await buildQuotationData(payload);
  const quotationNumber = await nextQuotationNumber();
  const issuedAt = new Date();

  const buffer = await renderQuotationPdf({ ...data, quotationNumber, createdAt: issuedAt });
  const fileName = `${quotationNumber}.pdf`;
  const filePath = path.join(UPLOAD_ROOT, UPLOAD_DIRS.QUOTATIONS, fileName);
  await fs.promises.writeFile(filePath, buffer);
  const pdf = toFileMeta({
    path: filePath,
    filename: fileName,
    originalname: fileName,
    mimetype: 'application/pdf',
    size: buffer.length,
  });

  let rspAttachment;
  try {
    if (data.rspAttachment) rspAttachment = { ...data.rspAttachment, file: await copyRspImage(data.rspAttachment, quotationNumber) };
  } catch (err) {
    await deleteStoredFile(pdf.path);
    throw err;
  }

  q.set({ ...data, rspAttachment, quotationNumber, pdf, status: QUOTATION_STATUS.READY, updatedBy: adminId });
  q.draft = undefined;
  if (!payload.draftId) q.createdAt = issuedAt;

  try {
    await q.save();
  } catch (err) {
    await deleteStoredFile(pdf.path);
    await deleteStoredFile(rspAttachment?.file?.path);
    throw err;
  }
  return getQuotationById(q._id);
};

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Values for the {{variables}} in email templates (see config/emailVariables.js).
// recipient: the person this particular email goes to (each recipient gets their own email)
const emailVariablesFor = (q, admin, recipient) => ({
  companyName: q.companySnapshot?.name || '',
  companyAddress: q.companySnapshot?.address || '',
  companyGstNumber: q.companySnapshot?.gstNumber || '',
  quotationNumber: q.quotationNumber || '',
  quotationDate: new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  rateMonth: q.rateMonth ? monthTitle(q.rateMonth) : '',
  products: (q.items || []).map((i) => i.name).join(', '),
  securityDeposit: money(q.securityDeposit),
  recipientName: recipient?.name || '',
  senderName: admin.name || '',
  senderEmail: admin.email || '',
});

// Filled in per email when sending, so they stay as {{placeholders}} in the editable text
const PER_EMAIL_VARIABLES = ['recipientName', 'pricingTable'];

const loadQuotationForEmail = async (id) => {
  const q = await Quotation.findById(id);
  if (!q) throw ApiError.notFound('Quotation not found');
  if (q.status === QUOTATION_STATUS.DRAFT) throw ApiError.badRequest('Complete the quotation before sending it');
  return q;
};

/**
 * The email as it will be sent with a given template (default: the quotation's own template).
 * Older quotations without a template (or whose template was deleted) use the default template,
 * else the first one; the built-in text is only a last resort when no templates exist at all.
 * Shared variables are filled in; {{recipientName}} and {{pricingTable}} stay as placeholders
 * and are filled in for each recipient on send.
 */
const composeEmail = async (id, admin, templateId) => {
  const q = await loadQuotationForEmail(id);

  let template = null;
  const wantedId = templateId || q.emailTemplate;
  if (wantedId) template = await EmailTemplate.findById(wantedId);
  if (templateId && !template) throw ApiError.badRequest('Selected email template was not found');
  if (!template) template = await EmailTemplate.findOne().sort({ isDefault: -1, name: 1 });

  const source = template || BUILT_IN_TEMPLATE;
  const format = source.format || EMAIL_FORMAT.TEXT;
  const values = emailVariablesFor(q, admin);
  const isHtml = format === EMAIL_FORMAT.HTML;
  return {
    templateId: template?._id || null,
    templateName: template?.name || BUILT_IN_TEMPLATE.name,
    format,
    subject: renderTemplate(source.subject, values, { keep: ['recipientName'], raw: { pricingTable: '' } }),
    message: renderTemplate(source.body, values, { html: isHtml, keep: PER_EMAIL_VARIABLES }),
    cc: source.cc || [],
    bcc: source.bcc || [],
    pricingTable: { html: buildPricingTableHtml(q), text: buildPricingTableText(q) },
  };
};

/**
 * Final subject/text/html of the email for one recipient. Variables are filled in again in case
 * the message was edited before sending; HTML is escaped per value, then the body is sanitised.
 */
const buildEmailContent = (q, admin, recipient, { subject, message, format }) => {
  const values = emailVariablesFor(q, admin, recipient);
  const tableHtml = buildPricingTableHtml(q);
  const tableText = buildPricingTableText(q);

  const finalSubject = renderTemplate(subject, values, { raw: { pricingTable: '' } }).replace(/\s+/g, ' ').trim();

  if (format === EMAIL_FORMAT.HTML) {
    const bodyHtml = sanitizeEmailHtml(renderTemplate(message, values, { html: true, raw: { pricingTable: tableHtml } }));
    return { subject: finalSubject, html: wrapEmailHtml(bodyHtml), text: htmlToText(bodyHtml) };
  }

  // Plain text: the HTML part keeps the line breaks and shows the pricing table as a real table
  const marker = `__PRICING_TABLE_${Date.now()}__`;
  const withMarker = renderTemplate(message, values, { raw: { pricingTable: marker } }).trim();
  return {
    subject: finalSubject,
    text: withMarker.split(marker).join(tableText),
    html: wrapEmailHtml(escapeHtml(withMarker).replace(/\n/g, '<br>').split(marker).join(tableHtml)),
  };
};

/**
 * Sends a separate email to each recipient, addressed to them alone (so {{recipientName}} is
 * their name). CC/BCC are added to every one of those emails. If some sends fail, the others
 * still go out and the failures are reported.
 */
const sendQuotationEmail = async (id, { templateId, subject, message, format = EMAIL_FORMAT.TEXT, cc = [], bcc = [] }, admin) => {
  const q = await loadQuotationForEmail(id);
  if (!q.pdf) throw ApiError.badRequest('This quotation has no PDF to attach');
  if (!q.recipients.length) throw ApiError.badRequest('This quotation has no recipients');
  if (templateId && !(await EmailTemplate.exists({ _id: templateId }))) {
    throw ApiError.badRequest('Selected email template was not found');
  }

  // A recipient is never also CC'd/BCC'd, and nobody is on both CC and BCC
  const recipientEmails = q.recipients.map((r) => r.email.toLowerCase());
  const ccEmails = [...new Set(cc.map((e) => e.toLowerCase()))].filter((e) => !recipientEmails.includes(e));
  const bccEmails = [...new Set(bcc.map((e) => e.toLowerCase()))].filter((e) => !recipientEmails.includes(e) && !ccEmails.includes(e));

  const pdfPath = path.resolve(UPLOAD_ROOT, q.pdf.path);
  if (!fs.existsSync(pdfPath)) throw ApiError.badRequest('The quotation PDF file is missing on the server');

  const attachments = [{ filename: `${q.quotationNumber}.pdf`, path: pdfPath, contentType: 'application/pdf' }];
  if (q.rspAttachment?.file?.path) {
    const rspPath = path.resolve(UPLOAD_ROOT, q.rspAttachment.file.path);
    if (!fs.existsSync(rspPath)) throw ApiError.badRequest('The attached RSP rates image is missing on the server');
    attachments.push({ filename: rspFileName(q.rspAttachment), path: rspPath, contentType: q.rspAttachment.file.mimeType });
  }

  // Build every email first so a bad template fails before anything is sent
  const emails = q.recipients.map((recipient) => ({
    recipient,
    content: buildEmailContent(q, admin, recipient, { subject, message, format }),
  }));
  if (emails.some((e) => !e.content.subject || !e.content.text.trim())) {
    throw ApiError.badRequest('Subject and message are required');
  }

  const sent = [];
  const failed = [];
  for (const { recipient, content } of emails) {
    try {
      const info = await sendMail({
        to: recipient.name ? `"${recipient.name.replace(/"/g, '')}" <${recipient.email}>` : recipient.email,
        cc: ccEmails,
        bcc: bccEmails,
        subject: content.subject,
        text: content.text,
        html: content.html,
        attachments,
      });
      sent.push({ recipient, subject: content.subject, info });
    } catch (err) {
      // Configuration problems affect every email, so stop at the first one
      if (err.statusCode === 503) throw err;
      failed.push({ email: recipient.email, error: err.message });
    }
  }

  if (!sent.length) {
    throw new ApiError(502, `Email could not be sent: ${failed.map((x) => `${x.email} (${x.error})`).join('; ')}`);
  }

  const sentAt = new Date();
  sent.forEach(({ recipient, subject: emailSubject, info }) =>
    q.emails.push({
      sentAt,
      sentBy: admin._id,
      to: [recipient.email.toLowerCase()],
      cc: ccEmails,
      bcc: bccEmails,
      subject: emailSubject,
      format,
      template: templateId || undefined,
      mode: info.mode,
      messageId: info.messageId,
    })
  );
  q.lastSentAt = sentAt;
  q.status = QUOTATION_STATUS.SENT;
  q.updatedBy = admin._id;
  await q.save();

  return {
    quotation: await getQuotationById(q._id),
    mode: sent[0].info.mode,
    sentTo: sent.map((x) => x.recipient.email),
    failed,
  };
};

/**
 * Wizard "Email Preview" step: the email each recipient will get, rendered from unsaved wizard
 * data with the selected template. Nothing is saved or sent.
 */
const previewEmails = async (payload, admin) => {
  const data = await buildQuotationData(payload);

  // buildQuotationData has already checked that the template exists
  const template = await EmailTemplate.findById(payload.emailTemplateId);
  const source = template;
  const format = source.format || EMAIL_FORMAT.TEXT;

  const quotationNumber = await peekNextQuotationNumber();
  const q = { ...data, quotationNumber, createdAt: new Date() };

  // Same CC/BCC clean-up as when sending
  const recipientEmails = q.recipients.map((r) => r.email.toLowerCase());
  const cc = (source.cc || []).filter((e) => !recipientEmails.includes(e));
  const bcc = (source.bcc || []).filter((e) => !recipientEmails.includes(e) && !cc.includes(e));

  return {
    templateName: template.name,
    format,
    quotationNumber,
    cc,
    bcc,
    attachment: `${quotationNumber}.pdf`,
    attachments: [`${quotationNumber}.pdf`, ...(q.rspAttachment ? [rspFileName(q.rspAttachment)] : [])],
    emails: q.recipients.map((recipient) => {
      const content = buildEmailContent(q, admin, recipient, { subject: source.subject, message: source.body, format });
      return {
        name: recipient.name,
        email: recipient.email,
        designation: recipient.designation,
        subject: content.subject,
        html: content.html,
      };
    }),
  };
};

/**
 * "Company Quotations" page: every company with its quotation counts per status and last activity.
 * Companies with recent quotation activity come first; ones without quotations follow by name.
 * query.withQuotations=true hides companies that have none.
 */
const companySummaries = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const match = {};
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    match.$or = [{ name: regex }, { gstNumber: regex }];
  }

  const [result] = await Company.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'quotations',
        let: { companyId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$company', '$$companyId'] } } },
          { $group: { _id: '$status', count: { $sum: 1 }, last: { $max: '$updatedAt' } } },
        ],
        as: 'byStatus',
      },
    },
    { $addFields: { totalQuotations: { $sum: '$byStatus.count' }, lastActivity: { $max: '$byStatus.last' } } },
    ...(query.withQuotations === 'true' ? [{ $match: { totalQuotations: { $gt: 0 } } }] : []),
    { $sort: { lastActivity: -1, name: 1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
          { $project: { name: 1, gstNumber: 1, address: 1, status: 1, byStatus: 1, totalQuotations: 1, lastActivity: 1 } },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const items = result.items.map((c) => {
    const counts = { draft: 0, ready: 0, sent: 0 };
    c.byStatus.forEach((s) => {
      counts[s._id] = s.count;
    });
    return {
      _id: c._id,
      name: c.name,
      gstNumber: c.gstNumber,
      address: c.address,
      status: c.status,
      counts,
      totalQuotations: c.totalQuotations,
      lastActivity: c.lastActivity || null,
    };
  });
  return { items, meta: buildMeta(result.total[0]?.count || 0, page, limit) };
};

// Recently used CC and BCC addresses (separately), most recent first, for suggestions
const recentCopyAddresses = async (limit = 20) => {
  const recent = (field) =>
    Quotation.aggregate([
      { $unwind: '$emails' },
      { $unwind: `$emails.${field}` },
      { $group: { _id: `$emails.${field}`, lastUsed: { $max: '$emails.sentAt' } } },
      { $sort: { lastUsed: -1 } },
      { $limit: limit },
    ]).then((rows) => rows.map((r) => r._id));

  const [cc, bcc] = await Promise.all([recent('cc'), recent('bcc')]);
  return { cc, bcc };
};

/* ------------------------------------------------------------------ */
/* List / delete                                                       */
/* ------------------------------------------------------------------ */

const listQuotations = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.company) filter.company = query.company;
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ quotationNumber: regex }, { 'companySnapshot.name': regex }, { 'items.name': regex }];
  }

  const [items, total] = await Promise.all([
    Quotation.find(filter, { terms: 0, emails: 0 })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name')
      .populate('draft.items.product', 'name'),
    Quotation.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

// Any admin may discard a draft; completed quotations can only be deleted by a super admin
const deleteQuotation = async (id, admin) => {
  const q = await Quotation.findById(id);
  if (!q) throw ApiError.notFound('Quotation not found');
  if (q.status !== QUOTATION_STATUS.DRAFT && admin.role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('Only a super admin can delete a completed quotation');
  }
  await q.deleteOne();
  await deleteStoredFile(q.pdf?.path);
  await deleteStoredFile(q.rspAttachment?.file?.path);
};

module.exports = {
  previewPdf,
  previewEmails,
  saveDraft,
  createQuotation,
  sendQuotationEmail,
  composeEmail,
  recentCopyAddresses,
  companySummaries,
  listQuotations,
  getQuotationById,
  deleteQuotation,
};
