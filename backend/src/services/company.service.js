const Company = require('../models/Company');
const CompanyEmployee = require('../models/CompanyEmployee');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { toFileMeta, deleteStoredFile } = require('../utils/file');
const { COMPANY_FILE_FIELDS } = require('../config/constants');

const TEXT_FIELDS = ['name', 'address', 'email', 'phone', 'gstNumber', 'panNumber', 'msmeNumber'];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listCompanies = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { gstNumber: regex }, { panNumber: regex }, { email: regex }, { phone: regex }];
  }

  const [companies, total] = await Promise.all([
    Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Company.countDocuments(filter),
  ]);

  const counts = await CompanyEmployee.aggregate([
    { $match: { company: { $in: companies.map((c) => c._id) } } },
    { $group: { _id: '$company', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const items = companies.map((c) => ({ ...c.toJSON(), memberCount: countMap.get(String(c._id)) || 0 }));
  return { items, meta: buildMeta(total, page, limit) };
};

const getCompanyById = async (id) => {
  const company = await Company.findById(id);
  if (!company) throw ApiError.notFound('Company not found');
  return company;
};

const getCompanyDetail = async (id) => {
  const company = await getCompanyById(id);
  const memberCount = await CompanyEmployee.countDocuments({ company: id });
  return { ...company.toJSON(), memberCount };
};

const assertGstAvailable = async (gstNumber, excludeId) => {
  const filter = { gstNumber: gstNumber.toUpperCase() };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Company.exists(filter)) throw ApiError.conflict('A company with this GST number already exists');
};

const createCompany = async (data, files = {}, createdBy) => {
  await assertGstAvailable(data.gstNumber);

  const doc = { createdBy };
  TEXT_FIELDS.forEach((f) => {
    if (data[f]) doc[f] = data[f];
  });
  COMPANY_FILE_FIELDS.forEach((f) => {
    if (files[f]?.[0]) doc[f] = toFileMeta(files[f][0]);
  });

  return Company.create(doc);
};

const updateCompany = async (id, data, files = {}) => {
  const company = await getCompanyById(id);

  if (data.gstNumber && data.gstNumber.toUpperCase() !== company.gstNumber) {
    await assertGstAvailable(data.gstNumber, id);
  }

  TEXT_FIELDS.forEach((f) => {
    if (data[f] !== undefined) company[f] = data[f] === '' ? undefined : data[f];
  });
  if (data.status) company.status = data.status;

  // Old files are only deleted after the new state is saved successfully
  const staleFiles = [];
  const removeList = data.removeFiles || [];

  COMPANY_FILE_FIELDS.forEach((f) => {
    const upload = files[f]?.[0];
    if (upload) {
      if (company[f]) staleFiles.push(company[f].path);
      company[f] = toFileMeta(upload);
    } else if (removeList.includes(f) && company[f]) {
      staleFiles.push(company[f].path);
      company[f] = undefined;
    }
  });

  await company.save();
  await Promise.all(staleFiles.map(deleteStoredFile));
  return company;
};

const deleteCompany = async (id) => {
  const company = await getCompanyById(id);
  const filePaths = COMPANY_FILE_FIELDS.map((f) => company[f]?.path).filter(Boolean);

  await CompanyEmployee.deleteMany({ company: id });
  await company.deleteOne();
  await Promise.all(filePaths.map(deleteStoredFile));
};

const getStats = async () => {
  const [total, active, members] = await Promise.all([
    Company.countDocuments(),
    Company.countDocuments({ status: 'active' }),
    CompanyEmployee.countDocuments(),
  ]);
  return { total, active, inactive: total - active, members };
};

module.exports = {
  listCompanies,
  getCompanyById,
  getCompanyDetail,
  createCompany,
  updateCompany,
  deleteCompany,
  getStats,
};
