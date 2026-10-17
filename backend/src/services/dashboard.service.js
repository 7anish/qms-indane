const Quotation = require('../models/Quotation');
const Company = require('../models/Company');
const CompanyEmployee = require('../models/CompanyEmployee');
const Product = require('../models/Product');
const Term = require('../models/Term');
const EmailTemplate = require('../models/EmailTemplate');
const { QUOTATION_STATUS, COMPANY_STATUS, PRODUCT_STATUS } = require('../config/constants');

const MONTHS_IN_CHART = 6;
const LIST_LIMIT = 5;

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Quotations created per month for the last N months, split by current status
const quotationsByMonth = async (now) => {
  const from = new Date(now.getFullYear(), now.getMonth() - (MONTHS_IN_CHART - 1), 1);
  const rows = await Quotation.aggregate([
    { $match: { createdAt: { $gte: from } } },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+05:30' } }, status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  const months = [];
  for (let i = 0; i < MONTHS_IN_CHART; i += 1) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    months.push({ month: monthKey(d), draft: 0, ready: 0, sent: 0 });
  }
  const byKey = new Map(months.map((m) => [m.month, m]));
  rows.forEach((r) => {
    const m = byKey.get(r._id.month);
    if (m && r._id.status in m) m[r._id.status] = r.count;
  });
  return months;
};

const getDashboard = async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lean = (q) => q.lean();

  const [
    quotationStatusRows,
    quotationsThisMonth,
    emailsThisMonthRows,
    companies,
    activeCompanies,
    members,
    products,
    activeProducts,
    terms,
    templates,
    chart,
    readyToSend,
    drafts,
    recentQuotations,
    recentEmails,
    recentPriceChanges,
    topCompanies,
    currentRates,
  ] = await Promise.all([
    Quotation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Quotation.countDocuments({ createdAt: { $gte: monthStart }, status: { $ne: QUOTATION_STATUS.DRAFT } }),
    Quotation.aggregate([
      { $unwind: '$emails' },
      { $match: { 'emails.sentAt': { $gte: monthStart } } },
      { $count: 'count' },
    ]),
    Company.countDocuments(),
    Company.countDocuments({ status: COMPANY_STATUS.ACTIVE }),
    CompanyEmployee.countDocuments(),
    Product.countDocuments(),
    Product.countDocuments({ status: PRODUCT_STATUS.ACTIVE }),
    Term.countDocuments(),
    EmailTemplate.countDocuments(),
    quotationsByMonth(now),

    // Completed but never emailed: the main to-do
    lean(
      Quotation.find({ status: QUOTATION_STATUS.READY }, { quotationNumber: 1, companySnapshot: 1, rateMonth: 1, recipients: 1, createdAt: 1 })
        .sort({ createdAt: 1 })
        .limit(LIST_LIMIT)
    ),
    lean(
      Quotation.find({ status: QUOTATION_STATUS.DRAFT }, { companySnapshot: 1, 'draft.step': 1, 'draft.items': 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .limit(LIST_LIMIT)
        .populate('draft.items.product', 'name')
    ),
    lean(
      Quotation.find(
        { status: { $ne: QUOTATION_STATUS.DRAFT } },
        { quotationNumber: 1, companySnapshot: 1, rateMonth: 1, status: 1, items: 1, createdAt: 1, lastSentAt: 1 }
      )
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
    ),
    Quotation.aggregate([
      { $unwind: '$emails' },
      { $sort: { 'emails.sentAt': -1 } },
      { $limit: LIST_LIMIT },
      { $lookup: { from: 'admins', localField: 'emails.sentBy', foreignField: '_id', as: 'sender' } },
      {
        $project: {
          quotationId: '$_id',
          quotationNumber: 1,
          companyName: '$companySnapshot.name',
          sentAt: '$emails.sentAt',
          to: '$emails.to',
          subject: '$emails.subject',
          mode: '$emails.mode',
          sentBy: { $arrayElemAt: ['$sender.name', 0] },
        },
      },
    ]),
    Product.aggregate([
      { $unwind: '$previousPrices' },
      { $sort: { 'previousPrices.changedOn': -1 } },
      { $limit: LIST_LIMIT },
      {
        $project: {
          productId: '$_id',
          name: 1,
          oldPrice: '$previousPrices.oldPrice',
          newPrice: '$previousPrices.newPrice',
          changedOn: '$previousPrices.changedOn',
        },
      },
    ]),
    Quotation.aggregate([
      { $match: { status: { $ne: QUOTATION_STATUS.DRAFT } } },
      { $group: { _id: '$company', name: { $last: '$companySnapshot.name' }, quotations: { $sum: 1 }, last: { $max: '$createdAt' } } },
      { $sort: { quotations: -1, last: -1 } },
      { $limit: LIST_LIMIT },
    ]),
    lean(
      Product.find({ status: PRODUCT_STATUS.ACTIVE }, { name: 1, gasType: 1, cylinderCapacityKg: 1, unit: 1, currentPrice: 1, previousPrices: { $slice: -1 } })
        .sort({ name: 1 })
        .limit(8)
    ),
  ]);

  const byStatus = Object.fromEntries(quotationStatusRows.map((r) => [r._id, r.count]));

  return {
    generatedAt: now,
    stats: {
      quotations: {
        total: quotationStatusRows.reduce((s, r) => s + r.count, 0),
        draft: byStatus.draft || 0,
        ready: byStatus.ready || 0,
        sent: byStatus.sent || 0,
        createdThisMonth: quotationsThisMonth,
      },
      emailsThisMonth: emailsThisMonthRows[0]?.count || 0,
      companies: { total: companies, active: activeCompanies, members },
      products: { total: products, active: activeProducts },
      terms,
      emailTemplates: templates,
    },
    chart,
    readyToSend: readyToSend.map((q) => ({
      _id: q._id,
      quotationNumber: q.quotationNumber,
      companyName: q.companySnapshot?.name,
      rateMonth: q.rateMonth,
      recipients: (q.recipients || []).length,
      createdAt: q.createdAt,
    })),
    drafts: drafts.map((q) => ({
      _id: q._id,
      companyName: q.companySnapshot?.name,
      step: q.draft?.step || 0,
      products: (q.draft?.items || []).map((i) => i.product?.name).filter(Boolean),
      updatedAt: q.updatedAt,
    })),
    recentQuotations: recentQuotations.map((q) => ({
      _id: q._id,
      quotationNumber: q.quotationNumber,
      companyName: q.companySnapshot?.name,
      rateMonth: q.rateMonth,
      status: q.status,
      products: (q.items || []).map((i) => i.name),
      createdAt: q.createdAt,
      lastSentAt: q.lastSentAt,
    })),
    recentEmails,
    recentPriceChanges,
    topCompanies: topCompanies.map((c) => ({ _id: c._id, name: c.name, quotations: c.quotations, last: c.last })),
    currentRates: currentRates.map((p) => ({
      _id: p._id,
      name: p.name,
      gasType: p.gasType,
      capacityKg: p.cylinderCapacityKg,
      unit: p.unit,
      currentPrice: p.currentPrice,
      lastChange: p.previousPrices?.[0] || null,
    })),
  };
};

module.exports = { getDashboard };
