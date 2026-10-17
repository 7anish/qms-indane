const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const memberService = require('../services/companyEmployee.service');
const importService = require('../services/memberImport.service');
const ApiError = require('../utils/ApiError');
const { sendWorkbook } = require('../utils/excel');

const downloadTemplate = asyncHandler(async (req, res) => {
  const { wb, company } = await importService.buildTemplate(req.params.companyId);
  const slug = company.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'company';
  await sendWorkbook(res, wb, `QMS-members-${slug}-template.xlsx`);
});

const importExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please choose an .xlsx file to import');
  const result = await importService.importFromFile(req.params.companyId, req.file.path, req.admin._id);
  sendResponse(res, 201, result, `Imported ${result.created} members`);
});

const list = asyncHandler(async (req, res) => {
  const result = await memberService.listMembers(req.params.companyId, req.query);
  sendResponse(res, 200, result);
});

const getOne = asyncHandler(async (req, res) => {
  const member = await memberService.getMember(req.params.companyId, req.params.memberId);
  sendResponse(res, 200, member);
});

const create = asyncHandler(async (req, res) => {
  const member = await memberService.createMember(req.params.companyId, req.body, req.admin._id);
  sendResponse(res, 201, member, 'Member added');
});

const update = asyncHandler(async (req, res) => {
  const member = await memberService.updateMember(req.params.companyId, req.params.memberId, req.body);
  sendResponse(res, 200, member, 'Member updated');
});

const remove = asyncHandler(async (req, res) => {
  await memberService.deleteMember(req.params.companyId, req.params.memberId);
  sendResponse(res, 200, null, 'Member removed');
});

module.exports = { list, getOne, create, update, remove, downloadTemplate, importExcel };
