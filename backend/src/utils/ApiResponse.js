const sendResponse = (res, statusCode, data = null, message = 'Success') =>
  res.status(statusCode).json({ success: true, message, data });

module.exports = { sendResponse };
