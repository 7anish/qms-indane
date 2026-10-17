const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const productService = require('../services/product.service');
const importService = require('../services/productImport.service');
const ApiError = require('../utils/ApiError');
const { sendWorkbook } = require('../utils/excel');

const downloadTemplate = asyncHandler(async (req, res) => {
  await sendWorkbook(res, importService.buildTemplate(), 'QMS-products-template.xlsx');
});

const importExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please choose an .xlsx file to import');
  const result = await importService.importFromFile(req.file.path, req.admin._id);
  sendResponse(res, 201, result, `Imported ${result.created} products`);
});

const imageOf = (req) => req.files?.image?.[0];

const list = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  sendResponse(res, 200, result);
});

const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.productId);
  sendResponse(res, 200, product);
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, imageOf(req), req.admin._id);
  sendResponse(res, 201, product, 'Product created');
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.productId, req.body, imageOf(req), req.admin._id);
  sendResponse(res, 200, product, 'Product updated');
});

const remove = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.productId);
  sendResponse(res, 200, null, 'Product deleted');
});

module.exports = { list, getOne, create, update, remove, downloadTemplate, importExcel };
