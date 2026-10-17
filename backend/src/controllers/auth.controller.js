const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const authService = require('../services/auth.service');
const { nodeEnv } = require('../config/env');

const cookieOptions = {
  httpOnly: true,
  secure: nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};

const login = asyncHandler(async (req, res) => {
  const { token, admin } = await authService.login(req.body);
  res.cookie('token', token, cookieOptions);
  sendResponse(res, 200, { token, admin }, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: 0 });
  sendResponse(res, 200, null, 'Logged out');
});

const me = asyncHandler(async (req, res) => {
  sendResponse(res, 200, req.admin);
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.admin._id, req.body);
  sendResponse(res, 200, null, 'Password updated');
});

module.exports = { login, logout, me, changePassword };
