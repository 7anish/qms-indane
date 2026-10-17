const CompanyEmployee = require('../models/CompanyEmployee');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { getCompanyById } = require('./company.service');

const FIELDS = ['name', 'phone', 'email', 'designation'];

const listMembers = async (companyId, query) => {
  await getCompanyById(companyId);
  const { page, limit, skip } = getPagination(query);
  const filter = { company: companyId };

  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { phone: regex }, { email: regex }, { designation: regex }];
  }

  const [items, total] = await Promise.all([
    CompanyEmployee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CompanyEmployee.countDocuments(filter),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

const getMember = async (companyId, memberId) => {
  const member = await CompanyEmployee.findOne({ _id: memberId, company: companyId });
  if (!member) throw ApiError.notFound('Member not found');
  return member;
};

const createMember = async (companyId, data, createdBy) => {
  await getCompanyById(companyId);
  const doc = { company: companyId, createdBy };
  FIELDS.forEach((f) => {
    if (data[f]) doc[f] = data[f];
  });
  return CompanyEmployee.create(doc);
};

const updateMember = async (companyId, memberId, data) => {
  const member = await getMember(companyId, memberId);
  FIELDS.forEach((f) => {
    if (data[f] !== undefined) member[f] = data[f] === '' ? undefined : data[f];
  });
  await member.save();
  return member;
};

const deleteMember = async (companyId, memberId) => {
  const member = await getMember(companyId, memberId);
  await member.deleteOne();
};

module.exports = { listMembers, getMember, createMember, updateMember, deleteMember };
