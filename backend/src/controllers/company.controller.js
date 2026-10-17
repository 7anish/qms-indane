const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const companyService = require('../services/company.service');
const importService = require('../services/companyImport.service');
const ApiError = require('../utils/ApiError');
const { sendWorkbook } = require('../utils/excel');

const downloadTemplate = asyncHandler(async (req, res) => {
  await sendWorkbook(res, importService.buildTemplate(), 'QMS-companies-template.xlsx');
});

const importExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please choose an .xlsx file to import');
  const result = await importService.importFromFile(req.file.path, req.admin._id);
  sendResponse(res, 201, result, `Imported ${result.created} companies`);
});

const list = asyncHandler(async (req, res) => {
  const result = await companyService.listCompanies(req.query);
  sendResponse(res, 200, result);
});

const stats = asyncHandler(async (req, res) => {
  const result = await companyService.getStats();
  sendResponse(res, 200, result);
});

const getOne = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyDetail(req.params.companyId);
  sendResponse(res, 200, company);
});

const create = asyncHandler(async (req, res) => {
  const company = await companyService.createCompany(req.body, req.files, req.admin._id);
  sendResponse(res, 201, company, 'Company created');
});

const update = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompany(req.params.companyId, req.body, req.files);
  sendResponse(res, 200, company, 'Company updated');
});

const remove = asyncHandler(async (req, res) => {
  await companyService.deleteCompany(req.params.companyId);
  sendResponse(res, 200, null, 'Company deleted');
});

module.exports = { list, stats, getOne, create, update, remove, downloadTemplate, importExcel };
