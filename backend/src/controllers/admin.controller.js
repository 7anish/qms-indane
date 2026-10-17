const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const adminService = require('../services/admin.service');

const list = asyncHandler(async (req, res) => {
  const result = await adminService.listAdmins(req.query);
  sendResponse(res, 200, result);
});

const stats = asyncHandler(async (req, res) => {
  const result = await adminService.getStats();
  sendResponse(res, 200, result);
});

const getOne = asyncHandler(async (req, res) => {
  const admin = await adminService.getAdminById(req.params.id);
  sendResponse(res, 200, admin);
});

const create = asyncHandler(async (req, res) => {
  const admin = await adminService.createAdmin(req.body, req.admin._id);
  sendResponse(res, 201, admin, 'Admin created');
});

const update = asyncHandler(async (req, res) => {
  const admin = await adminService.updateAdmin(req.params.id, req.body, req.admin);
  sendResponse(res, 200, admin, 'Admin updated');
});

const remove = asyncHandler(async (req, res) => {
  await adminService.deleteAdmin(req.params.id, req.admin);
  sendResponse(res, 200, null, 'Admin deleted');
});

module.exports = { list, stats, getOne, create, update, remove };
