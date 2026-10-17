const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const termService = require('../services/term.service');

const list = asyncHandler(async (req, res) => {
  const result = await termService.listTerms(req.query);
  sendResponse(res, 200, result);
});

const getOne = asyncHandler(async (req, res) => {
  const term = await termService.getTermById(req.params.termId);
  sendResponse(res, 200, term);
});

const create = asyncHandler(async (req, res) => {
  const term = await termService.createTerm(req.body, req.admin._id);
  sendResponse(res, 201, term, 'Terms & Conditions added');
});

const update = asyncHandler(async (req, res) => {
  const term = await termService.updateTerm(req.params.termId, req.body, req.admin._id);
  sendResponse(res, 200, term, 'Terms & Conditions updated');
});

const remove = asyncHandler(async (req, res) => {
  await termService.deleteTerm(req.params.termId);
  sendResponse(res, 200, null, 'Terms & Conditions deleted');
});

module.exports = { list, getOne, create, update, remove };
