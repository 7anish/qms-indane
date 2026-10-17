const { body, param } = require('express-validator');
const { MAX_POINTS } = require('../models/Term');

const termIdRules = [param('termId').isMongoId().withMessage('Invalid terms id')];

const pointsRules = (optional) => [
  (optional ? body('points').optional() : body('points'))
    .isArray({ min: 1, max: MAX_POINTS })
    .withMessage(`Add between 1 and ${MAX_POINTS} points`),
  body('points.*')
    .isString()
    .withMessage('Each point must be text')
    .trim()
    .notEmpty()
    .withMessage('Points cannot be empty'),
];

const createTermRules = [
  body('heading').trim().notEmpty().withMessage('Heading is required'),
  ...pointsRules(false),
];

const updateTermRules = [
  ...termIdRules,
  body('heading').optional().trim().notEmpty().withMessage('Heading cannot be empty'),
  ...pointsRules(true),
];

module.exports = { termIdRules, createTermRules, updateTermRules };
