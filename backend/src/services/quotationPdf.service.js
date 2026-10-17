const PDFDocument = require('pdfkit');
const { GST_MODE } = require('../config/constants');

/*
 * Renders a quotation to a PDF Buffer. Used both for the live preview (unsaved data)
 * and for the PDF saved with the quotation, so both always look the same.
 * Layout of the rates table follows the company's existing monthly rate sheet.
 */

const PAGE = { size: 'A4', margin: 40 };
const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  border: '#000000',
  headerFill: '#FFFF00', // yellow month banner
  landedFill: '#92D050', // green landed-cost row
  accent: '#2563EB',
};
const PRODUCTS_PER_TABLE = 4;
const LABEL_COL_WIDTH = 215;

const money = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const monthTitle = (rateMonth) => {
  const [y, m] = rateMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase();
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const ensureSpace = (doc, needed) => {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
};

function drawHeader(doc, q) {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const top = doc.y;

  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.accent).text('QUOTATION', left, top);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(`Quotation No: ${q.quotationNumber}`, left, top + 2, { width, align: 'right' })
    .text(`Date: ${formatDate(q.createdAt || Date.now())}`, { width, align: 'right' });

  doc.y = Math.max(doc.y, top + 30) + 8;
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(1).strokeColor(COLORS.accent).stroke();
  doc.moveDown(0.8);

  const c = q.companySnapshot;
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('TO', left);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.text).text(c.name);
  doc.font('Helvetica').fontSize(10);
  if (c.address) doc.text(c.address, { width: width * 0.6 });
  if (c.gstNumber) doc.text(`GSTIN: ${c.gstNumber}`);
  const contact = [c.phone, c.email].filter(Boolean).join('  |  ');
  if (contact) doc.text(contact);
  doc.moveDown(1);
}

function drawRatesTable(doc, q, items) {
  const left = doc.page.margins.left;
  const tableWidth = doc.page.width - left - doc.page.margins.right;
  const colWidth = (tableWidth - LABEL_COL_WIDTH) / items.length;
  const pad = 6;
  const gstLabel =
    q.gstMode === GST_MODE.INCLUDED ? `GST @ ${q.gstRate}% (INCLUDED)` : `GST @ ${q.gstRate}%`;

  const rows = [
    { type: 'banner', text: `RATES FOR THE MONTH OF ${monthTitle(q.rateMonth)}` },
    {
      label: 'TYPE OF CYLINDER',
      bold: true,
      values: items.map((it) => `${it.name}\n${Number(it.capacityKg).toLocaleString('en-IN')} KGS`),
      align: 'center',
    },
    { label: (q.basicLabel || 'BASIC PRICE').toUpperCase(), values: items.map((it) => money(it.basicPrice)) },
    { label: 'DISCOUNT', values: items.map((it) => money(it.discount)), boldValues: true },
    { label: 'TAXABLE VALUE', values: items.map((it) => money(it.taxableValue)), boldValues: true },
    { label: gstLabel, values: items.map((it) => money(it.gstAmount)), boldValues: true },
    { label: 'TOTAL', values: items.map((it) => money(it.total)), bold: true, size: 12 },
    {
      label: 'LANDED COST PER KGS (EXCLUSIVE OF GST)',
      values: items.map((it) => money(it.landedCostPerKg)),
      bold: true,
      size: 12,
      fill: COLORS.landedFill,
    },
  ];

  // Measure every row first so the whole table can be kept on one page
  const measured = rows.map((row) => {
    const size = row.size || 10;
    if (row.type === 'banner') {
      doc.font('Helvetica-Bold').fontSize(11);
      return { ...row, height: doc.heightOfString(row.text, { width: tableWidth - pad * 2 }) + pad * 2 };
    }
    doc.font(row.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const labelH = doc.heightOfString(row.label, { width: LABEL_COL_WIDTH - pad * 2 });
    doc.font(row.bold || row.boldValues ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const valueH = Math.max(...row.values.map((v) => doc.heightOfString(v, { width: colWidth - pad * 2 })));
    return { ...row, height: Math.max(labelH, valueH) + pad * 2 };
  });

  ensureSpace(doc, measured.reduce((sum, r) => sum + r.height, 0) + 10);
  let y = doc.y;
  doc.lineWidth(0.75).strokeColor(COLORS.border);

  measured.forEach((row) => {
    const size = row.size || 10;

    if (row.type === 'banner') {
      doc.rect(left, y, tableWidth, row.height).fillAndStroke(COLORS.headerFill, COLORS.border);
      doc
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(row.text, left + pad, y + pad, { width: tableWidth - pad * 2, align: 'center' });
      y += row.height;
      return;
    }

    if (row.fill) doc.rect(left, y, tableWidth, row.height).fill(row.fill);
    doc.rect(left, y, LABEL_COL_WIDTH, row.height).stroke();
    doc
      .fillColor(COLORS.text)
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .text(row.label, left + pad, y + pad, { width: LABEL_COL_WIDTH - pad * 2 });

    row.values.forEach((value, i) => {
      const x = left + LABEL_COL_WIDTH + i * colWidth;
      doc.rect(x, y, colWidth, row.height).stroke();
      doc
        .fillColor(COLORS.text)
        .font(row.bold || row.boldValues ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(size)
        .text(value, x + pad, y + pad, { width: colWidth - pad * 2, align: row.align || 'right' });
    });
    y += row.height;
  });

  doc.x = left;
  doc.y = y + 14;
}

function drawSecurityDeposit(doc, q) {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  ensureSpace(doc, 40);
  const y = doc.y;
  doc.rect(left, y, width, 26).lineWidth(0.75).strokeColor(COLORS.border).stroke();
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COLORS.text)
    .text('SECURITY DEPOSIT', left + 6, y + 8, { width: width / 2 })
    .text(`Rs. ${money(q.securityDeposit)}`, left + width / 2, y + 8, { width: width / 2 - 6, align: 'right' });
  doc.x = left;
  doc.y = y + 26 + 18;
}

function drawTerms(doc, q) {
  if (!q.terms?.length) return;
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  ensureSpace(doc, 60);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.accent).text('TERMS & CONDITIONS', left);
  doc.moveDown(0.4);

  q.terms.forEach((term) => {
    ensureSpace(doc, 40);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.text).text(term.heading, left, doc.y, { width });
    doc.moveDown(0.2);
    term.points.forEach((point, i) => {
      const prefix = `${i + 1}.`;
      const y = doc.y;
      doc.font('Helvetica').fontSize(10).text(prefix, left + 8, y, { width: 18 });
      doc.text(point, left + 28, y, { width: width - 28 });
      doc.moveDown(0.15);
    });
    doc.moveDown(0.6);
  });
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    // Writing inside the bottom margin would make pdfkit start a new page, so lift the margin briefly
    const { bottom: bottomMargin } = doc.page.margins;
    doc.page.margins.bottom = 0;
    const bottom = doc.page.height - bottomMargin + 12;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        `This is a computer-generated quotation.   Page ${i + 1} of ${range.count}`,
        doc.page.margins.left,
        bottom,
        { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'center', lineBreak: false }
      );
    doc.page.margins.bottom = bottomMargin;
  }
}

/**
 * @param {object} q quotation-shaped data: quotationNumber, createdAt, companySnapshot, rateMonth,
 *   basicLabel, items[], gstMode, gstRate, securityDeposit, terms[]
 * @returns {Promise<Buffer>}
 */
const renderQuotationPdf = (q) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ ...PAGE, bufferPages: true, info: { Title: `Quotation ${q.quotationNumber}` } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, q);
    chunk(q.items, PRODUCTS_PER_TABLE).forEach((items) => drawRatesTable(doc, q, items));
    drawSecurityDeposit(doc, q);
    drawTerms(doc, q);
    drawFooter(doc);
    doc.end();
  });

module.exports = { renderQuotationPdf };
