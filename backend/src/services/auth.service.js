const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const { ADMIN_STATUS } = require('../config/constants');

const login = async ({ email, password }) => {
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (admin.status !== ADMIN_STATUS.ACTIVE) {
    throw ApiError.forbidden('Account is inactive');
  }

  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });

  const token = signToken({ id: admin._id, role: admin.role });
  return { token, admin };
};

const changePassword = async (adminId, { currentPassword, newPassword }) => {
  const admin = await Admin.findById(adminId).select('+password');
  if (!admin) throw ApiError.notFound('Admin not found');
  if (!(await admin.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  admin.password = newPassword;
  await admin.save();
};

module.exports = { login, changePassword };
