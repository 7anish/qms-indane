const EmailTemplate = require('../models/EmailTemplate');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');

const FIELDS = ['name', 'subject', 'format', 'body', 'cc', 'bcc', 'isDefault'];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unique = (list) => [...new Set((list || []).map((e) => e.toLowerCase()))];

const assertNameAvailable = async (name, excludeId) => {
  const filter = { name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await EmailTemplate.exists(filter)) throw ApiError.conflict(`A template named "${name.trim()}" already exists`);
};

// Only one template can be the default
const clearOtherDefaults = (exceptId) =>
  EmailTemplate.updateMany({ _id: { $ne: exceptId }, isDefault: true }, { $set: { isDefault: false } });

const listTemplates = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { subject: regex }];
  }
  const [items, total] = await Promise.all([
    EmailTemplate.find(filter).sort({ isDefault: -1, name: 1 }).skip(skip).limit(limit),
    EmailTemplate.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

const getTemplateById = async (id) => {
  const t = await EmailTemplate.findById(id);
  if (!t) throw ApiError.notFound('Email template not found');
  return t;
};

const createTemplate = async (data, adminId) => {
  await assertNameAvailable(data.name);
  const doc = { createdBy: adminId, updatedBy: adminId };
  FIELDS.forEach((f) => {
    if (data[f] !== undefined) doc[f] = data[f];
  });
  doc.cc = unique(doc.cc);
  doc.bcc = unique(doc.bcc);
  const t = await EmailTemplate.create(doc);
  if (t.isDefault) await clearOtherDefaults(t._id);
  return t;
};

const updateTemplate = async (id, data, adminId) => {
  const t = await getTemplateById(id);
  if (data.name && data.name.trim().toLowerCase() !== t.name.toLowerCase()) await assertNameAvailable(data.name, id);
  FIELDS.forEach((f) => {
    if (data[f] !== undefined) t[f] = f === 'cc' || f === 'bcc' ? unique(data[f]) : data[f];
  });
  t.updatedBy = adminId;
  await t.save();
  if (t.isDefault) await clearOtherDefaults(t._id);
  return t;
};

const deleteTemplate = async (id) => {
  const t = await getTemplateById(id);
  await t.deleteOne();
};

module.exports = { listTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate };
