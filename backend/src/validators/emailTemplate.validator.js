const { body, param } = require('express-validator');
const { findUnknownVariables } = require('../utils/template');
const { EMAIL_FORMAT } = require('../config/emailVariables');

const MAX_COPY = 20;

const templateIdRules = [param('templateId').isMongoId().withMessage('Invalid template id')];

const noUnknownVariables = (label) => (value) => {
  const unknown = findUnknownVariables(value);
  if (unknown.length) throw new Error(`${label} uses unknown variable(s): ${unknown.map((v) => `{{${v}}}`).join(', ')}`);
  return true;
};

// Reusable: a list of email addresses (CC/BCC)
const emailListRules = (field, label) => [
  body(field).optional().isArray({ max: MAX_COPY }).withMessage(`${label}: up to ${MAX_COPY} addresses`),
  body(`${field}.*`).trim().toLowerCase().isEmail().withMessage(`${label}: invalid email address`),
];

const templateFieldRules = (optional) => {
  const req = (chain) => (optional ? chain.optional() : chain);
  return [
    req(body('name')).trim().notEmpty().withMessage('Template name is required').isLength({ max: 100 }),
    req(body('subject'))
      .trim()
      .notEmpty()
      .withMessage('Subject is required')
      .isLength({ max: 200 })
      .withMessage('Subject is too long')
      .custom(noUnknownVariables('Subject')),
    req(body('body'))
      .notEmpty()
      .withMessage('Body is required')
      .isLength({ max: 50000 })
      .withMessage('Body is too long')
      .custom(noUnknownVariables('Body')),
    body('format').optional().isIn(Object.values(EMAIL_FORMAT)).withMessage('Format must be text or html'),
    ...emailListRules('cc', 'CC'),
    ...emailListRules('bcc', 'BCC'),
    body('isDefault').optional().isBoolean().withMessage('isDefault must be true or false').toBoolean(),
  ];
};

const createTemplateRules = templateFieldRules(false);
const updateTemplateRules = [...templateIdRules, ...templateFieldRules(true)];

module.exports = { templateIdRules, createTemplateRules, updateTemplateRules, emailListRules };
