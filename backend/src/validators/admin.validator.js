const { body, param } = require('express-validator');
const { ROLES, ADMIN_STATUS } = require('../config/constants');

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const createAdminRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim().isMobilePhone('any').withMessage('Invalid phone'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
];

const updateAdminRules = [
  param('id').isMongoId().withMessage('Invalid admin id'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim().isMobilePhone('any').withMessage('Invalid phone'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('status').optional().isIn(Object.values(ADMIN_STATUS)).withMessage('Invalid status'),
];

const idParamRules = [param('id').isMongoId().withMessage('Invalid admin id')];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

module.exports = {
  loginRules,
  createAdminRules,
  updateAdminRules,
  idParamRules,
  changePasswordRules,
};
