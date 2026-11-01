const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const marketService = require('../services/market.service');

// { ratesWithGst: file, ratesWithoutGst: file } from multer's fields upload
const imagesOf = (req) => ({
  ratesWithGst: req.files?.ratesWithGst?.[0],
  ratesWithoutGst: req.files?.ratesWithoutGst?.[0],
});

const list = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await marketService.listMarkets(req.query));
});

const getOne = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await marketService.getMarketById(req.params.marketId));
});

const create = asyncHandler(async (req, res) => {
  const market = await marketService.createMarket(req.body, imagesOf(req), req.admin._id);
  sendResponse(res, 201, market, 'Market added');
});

const update = asyncHandler(async (req, res) => {
  const market = await marketService.updateMarket(req.params.marketId, req.body, imagesOf(req), req.admin._id);
  sendResponse(res, 200, market, 'Market updated');
});

const remove = asyncHandler(async (req, res) => {
  await marketService.deleteMarket(req.params.marketId);
  sendResponse(res, 200, null, 'Market deleted');
});

module.exports = { list, getOne, create, update, remove };
