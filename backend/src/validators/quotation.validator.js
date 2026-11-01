const { body, param, query } = require('express-validator');
const { GST_MODE, RSP_GST } = require('../config/constants');
const { emailListRules } = require('./emailTemplate.validator');

const MAX_ITEMS = 20;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const quotationIdRules = [param('quotationId').isMongoId().withMessage('Invalid quotation id')];

// terms: [{ termId, points: [point text] }] - the points chosen from each Terms & Conditions entry
const termRules = [
  body('terms').optional().isArray().withMessage('Terms must be a list'),
  body('terms.*.termId').isMongoId().withMessage('Invalid terms id'),
  body('terms.*.points').isArray().withMessage('Terms points must be a list'),
  body('terms.*.points.*').isString().withMessage('Invalid terms point'),
];

// rsp: { marketId, gst } - optional market RSP rate image to attach to the email; null = none
const rspRules = [
  body('rsp').optional({ values: 'null' }).isObject().withMessage('Invalid RSP attachment'),
  body('rsp.marketId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid market'),
  body('rsp.gst').optional({ values: 'falsy' }).isIn(Object.values(RSP_GST)).withMessage('Choose the rates with or without GST'),
];

// Full payload: shared by preview and create, so the preview always matches what will be saved
const quotationPayloadRules = [
  body('draftId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid draft id'),
  body('companyId').isMongoId().withMessage('Select a company'),

  body('items').isArray({ min: 1, max: MAX_ITEMS }).withMessage(`Add between 1 and ${MAX_ITEMS} products`),
  body('items.*.productId').isMongoId().withMessage('Invalid product'),
  body('items.*.basicPrice')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Basic price must be 0 or more')
    .toFloat(),
  body('items.*.discount')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Discount must be 0 or more')
    .toFloat(),
  body('items.*.securityAmount')
    .optional({ values: 'null' })
    .isFloat({ min: 0 })
    .withMessage('Security amount must be 0 or more')
    .toFloat(),

  body('gstMode').optional().isIn(Object.values(GST_MODE)).withMessage('GST must be included or excluded'),
  body('gstRate').optional().isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100').toFloat(),
  body('rateMonth').optional().matches(MONTH_REGEX).withMessage('Rate month must be in YYYY-MM format'),
  body('basicLabel').optional().trim().isLength({ max: 60 }).withMessage('Basic price label is too long'),

  ...termRules,
  ...rspRules,

  body('emailTemplateId').notEmpty().withMessage('Select an email template').bail().isMongoId().withMessage('Invalid email template'),

  body('recipientIds').isArray({ min: 1 }).withMessage('Select at least one employee to send the quotation to'),
  body('recipientIds.*').isMongoId().withMessage('Invalid employee'),
];

// Draft payload: everything except the company is optional and may be incomplete
const draftPayloadRules = [
  body('companyId').isMongoId().withMessage('Select a company before saving a draft'),
  body('items').optional().isArray({ max: MAX_ITEMS }).withMessage(`A maximum of ${MAX_ITEMS} products is allowed`),
  body('items.*.productId').isMongoId().withMessage('Invalid product'),
  body('items.*.basicPrice').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Basic price must be 0 or more').toFloat(),
  body('items.*.discount').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Discount must be 0 or more').toFloat(),
  body('items.*.securityAmount').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Security amount must be 0 or more').toFloat(),
  body('gstMode').optional({ values: 'falsy' }).isIn(Object.values(GST_MODE)).withMessage('GST must be included or excluded'),
  body('gstRate').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100').toFloat(),
  body('rateMonth').optional({ values: 'falsy' }).matches(MONTH_REGEX).withMessage('Rate month must be in YYYY-MM format'),
  body('basicLabel').optional({ values: 'null' }).trim().isLength({ max: 60 }).withMessage('Basic price label is too long'),
  ...termRules,
  ...rspRules,
  body('recipientIds').optional().isArray().withMessage('Recipients must be a list'),
  body('recipientIds.*').isMongoId().withMessage('Invalid employee'),
  body('emailTemplateId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid email template'),
  body('step').optional().isInt({ min: 0, max: 10 }).withMessage('Invalid step').toInt(),
];

const composeEmailRules = [
  ...quotationIdRules,
  query('templateId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid email template'),
];

const sendEmailRules = [
  ...quotationIdRules,
  body('templateId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid email template'),
  body('subject')
    .isString()
    .withMessage('Subject is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject is too long'),
  body('message')
    .isString()
    .withMessage('Message is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 50000 })
    .withMessage('Message is too long'),
  body('format').optional().isIn(['text', 'html']).withMessage('Format must be text or html'),
  ...emailListRules('cc', 'CC'),
  ...emailListRules('bcc', 'BCC'),
];

module.exports = { quotationIdRules, quotationPayloadRules, draftPayloadRules, composeEmailRules, sendEmailRules };
