const { body, param } = require('express-validator');
const { COMPANY_STATUS, GST_REGEX, PAN_REGEX, COMPANY_FILE_FIELDS } = require('../config/constants');

const optionalEmail = (field) =>
  body(field).optional({ values: 'falsy' }).trim().isEmail().withMessage('Invalid email');

const optionalPhone = (field) =>
  body(field).optional({ values: 'falsy' }).trim().isMobilePhone('any').withMessage('Invalid phone number');

const companyIdRules = [param('companyId').isMongoId().withMessage('Invalid company id')];

const createCompanyRules = [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  optionalEmail('email'),
  optionalPhone('phone'),
  body('gstNumber')
    .trim()
    .toUpperCase()
    .matches(GST_REGEX)
    .withMessage('Valid GST number is required (e.g. 27ABCDE1234F1Z5)'),
  body('panNumber')
    .trim()
    .toUpperCase()
    .matches(PAN_REGEX)
    .withMessage('Valid PAN number is required (e.g. ABCDE1234F)'),
  body('msmeNumber').trim().notEmpty().withMessage('MSME number is required').toUpperCase(),
];

const updateCompanyRules = [
  ...companyIdRules,
  body('name').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty'),
  optionalEmail('email'),
  optionalPhone('phone'),
  body('gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(GST_REGEX)
    .withMessage('Invalid GST number (e.g. 27ABCDE1234F1Z5)'),
  body('panNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(PAN_REGEX)
    .withMessage('Invalid PAN number (e.g. ABCDE1234F)'),
  body('msmeNumber').optional().trim().notEmpty().withMessage('MSME number cannot be empty').toUpperCase(),
  body('status').optional().isIn(Object.values(COMPANY_STATUS)).withMessage('Invalid status'),
  // Comma-separated list of document fields to delete, e.g. "gstCertificate,panBack"
  body('removeFiles')
    .optional({ values: 'falsy' })
    .customSanitizer((v) => String(v).split(',').map((s) => s.trim()).filter(Boolean))
    .custom((list) => list.every((f) => COMPANY_FILE_FIELDS.includes(f)))
    .withMessage(`removeFiles may only contain: ${COMPANY_FILE_FIELDS.join(', ')}`),
];

const memberIdRules = [
  ...companyIdRules,
  param('memberId').isMongoId().withMessage('Invalid member id'),
];

const createMemberRules = [
  ...companyIdRules,
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().isMobilePhone('any').withMessage('Valid phone number is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('designation').trim().notEmpty().withMessage('Designation is required'),
];

const updateMemberRules = [
  ...memberIdRules,
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim().isMobilePhone('any').withMessage('Invalid phone number'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required'),
  body('designation').optional().trim().notEmpty().withMessage('Designation cannot be empty'),
];

module.exports = {
  companyIdRules,
  createCompanyRules,
  updateCompanyRules,
  memberIdRules,
  createMemberRules,
  updateMemberRules,
};
