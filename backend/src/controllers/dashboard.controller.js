const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const dashboardService = require('../services/dashboard.service');

const getDashboard = asyncHandler(async (req, res) => {
  sendResponse(res, 200, await dashboardService.getDashboard());
});

module.exports = { getDashboard };
