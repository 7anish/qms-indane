const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const { ADMIN_STATUS } = require('../config/constants');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) throw ApiError.unauthorized('Not authenticated');

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const admin = await Admin.findById(decoded.id);
  if (!admin) throw ApiError.unauthorized('Account no longer exists');
  if (admin.status !== ADMIN_STATUS.ACTIVE) throw ApiError.forbidden('Account is inactive');

  req.admin = admin;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};

module.exports = { protect, authorize };
