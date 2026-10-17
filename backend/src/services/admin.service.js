const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../config/constants');

const listAdmins = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const [items, total] = await Promise.all([
    Admin.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Admin.countDocuments(filter),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
};

const getAdminById = async (id) => {
  const admin = await Admin.findById(id);
  if (!admin) throw ApiError.notFound('Admin not found');
  return admin;
};

const createAdmin = async (data, createdBy) => {
  const exists = await Admin.exists({ email: data.email.toLowerCase() });
  if (exists) throw ApiError.conflict('Email already in use');

  return Admin.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role: data.role || ROLES.ADMIN,
    createdBy,
  });
};

const updateAdmin = async (id, data, actor) => {
  const admin = await getAdminById(id);

  if (String(admin._id) === String(actor._id) && (data.role || data.status)) {
    throw ApiError.badRequest('You cannot change your own role or status');
  }

  if (data.email && data.email.toLowerCase() !== admin.email) {
    const exists = await Admin.exists({ email: data.email.toLowerCase(), _id: { $ne: id } });
    if (exists) throw ApiError.conflict('Email already in use');
  }

  ['name', 'email', 'phone', 'role', 'status'].forEach((field) => {
    if (data[field] !== undefined) admin[field] = data[field];
  });

  await admin.save();
  return admin;
};

const deleteAdmin = async (id, actor) => {
  if (String(id) === String(actor._id)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const admin = await getAdminById(id);

  if (admin.role === ROLES.SUPER_ADMIN) {
    const count = await Admin.countDocuments({ role: ROLES.SUPER_ADMIN });
    if (count <= 1) throw ApiError.badRequest('Cannot delete the last super admin');
  }

  await admin.deleteOne();
};

const getStats = async () => {
  const [total, active, superAdmins] = await Promise.all([
    Admin.countDocuments(),
    Admin.countDocuments({ status: 'active' }),
    Admin.countDocuments({ role: ROLES.SUPER_ADMIN }),
  ]);
  return { total, active, inactive: total - active, superAdmins, admins: total - superAdmins };
};

module.exports = {
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getStats,
};
