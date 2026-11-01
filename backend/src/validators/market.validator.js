const { body, param } = require('express-validator');

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const marketIdRules = [param('marketId').isMongoId().withMessage('Invalid market id')];

const createMarketRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title is too long'),
  body('ratesMonth').matches(MONTH_REGEX).withMessage('Select the month of the rates'),
];

const updateMarketRules = [
  ...marketIdRules,
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 100 }).withMessage('Title is too long'),
  body('ratesMonth').optional().matches(MONTH_REGEX).withMessage('Select the month of the rates'),
];

module.exports = { marketIdRules, createMarketRules, updateMarketRules };
