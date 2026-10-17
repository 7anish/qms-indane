const Term = require('../models/Term');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');

const listTerms = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ heading: regex }, { points: regex }];
  }

  const [items, total] = await Promise.all([
    Term.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Term.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

const getTermById = async (id) => {
  const term = await Term.findById(id);
  if (!term) throw ApiError.notFound('Terms & Conditions not found');
  return term;
};

const createTerm = (data, adminId) =>
  Term.create({
    heading: data.heading,
    points: data.points,
    createdBy: adminId,
    updatedBy: adminId,
  });

const updateTerm = async (id, data, adminId) => {
  const term = await getTermById(id);
  if (data.heading !== undefined) term.heading = data.heading;
  if (data.points !== undefined) term.points = data.points;
  term.updatedBy = adminId;
  await term.save();
  return term;
};

const deleteTerm = async (id) => {
  const term = await getTermById(id);
  await term.deleteOne();
};

module.exports = { listTerms, getTermById, createTerm, updateTerm, deleteTerm };
