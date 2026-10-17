const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const templateService = require('../services/emailTemplate.service');
const { EMAIL_VARIABLES, BUILT_IN_TEMPLATE, SAMPLE_QUOTATION } = require('../config/emailVariables');
const { buildPricingTableHtml, buildPricingTableText } = require('../utils/pricingTable');

// Variables that can be used in templates, with sample values for previews
const variables = asyncHandler(async (req, res) => {
  sendResponse(res, 200, {
    variables: EMAIL_VARIABLES,
    builtIn: BUILT_IN_TEMPLATE,
    // Example rate sheet for previewing {{pricingTable}}
    samplePricingTable: { html: buildPricingTableHtml(SAMPLE_QUOTATION), text: buildPricingTableText(SAMPLE_QUOTATION) },
  });
});

const list = asyncHandler(async (req, res) => {
  const result = await templateService.listTemplates(req.query);
  sendResponse(res, 200, result);
});

const getOne = asyncHandler(async (req, res) => {
  const t = await templateService.getTemplateById(req.params.templateId);
  sendResponse(res, 200, t);
});

const create = asyncHandler(async (req, res) => {
  const t = await templateService.createTemplate(req.body, req.admin._id);
  sendResponse(res, 201, t, 'Email template created');
});

const update = asyncHandler(async (req, res) => {
  const t = await templateService.updateTemplate(req.params.templateId, req.body, req.admin._id);
  sendResponse(res, 200, t, 'Email template updated');
});

const remove = asyncHandler(async (req, res) => {
  await templateService.deleteTemplate(req.params.templateId);
  sendResponse(res, 200, null, 'Email template deleted');
});

module.exports = { variables, list, getOne, create, update, remove };
