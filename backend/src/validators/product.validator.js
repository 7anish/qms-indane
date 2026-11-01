const { body, param } = require('express-validator');
const { PRODUCT_STATUS } = require('../config/constants');

const productIdRules = [param('productId').isMongoId().withMessage('Invalid product id')];

const capacityRule = (chain) =>
  chain.isFloat({ gt: 0 }).withMessage('Cylinder capacity must be a number greater than 0').toFloat();

const priceRule = (chain) =>
  chain.isFloat({ min: 0 }).withMessage('Price must be a number of 0 or more').toFloat();

const securityRule = (chain) =>
  chain.isFloat({ min: 0 }).withMessage('Security amount must be a number of 0 or more').toFloat();

const createProductRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('unit').trim().notEmpty().withMessage('Unit is required'),
  body('status').optional().isIn(Object.values(PRODUCT_STATUS)).withMessage('Status must be active or inactive'),
  body('gasType').trim().notEmpty().withMessage('Gas type is required'),
  capacityRule(body('cylinderCapacityKg')),
  priceRule(body('currentPrice')),
  securityRule(body('securityAmount').optional({ values: 'falsy' })),
];

const updateProductRules = [
  ...productIdRules,
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('unit').optional().trim().notEmpty().withMessage('Unit cannot be empty'),
  body('status').optional().isIn(Object.values(PRODUCT_STATUS)).withMessage('Status must be active or inactive'),
  body('gasType').optional().trim().notEmpty().withMessage('Gas type cannot be empty'),
  capacityRule(body('cylinderCapacityKg').optional()),
  priceRule(body('currentPrice').optional()),
  securityRule(body('securityAmount').optional()),
  body('removeImage').optional().isBoolean().withMessage('removeImage must be true or false').toBoolean(),
];

module.exports = { productIdRules, createProductRules, updateProductRules };
