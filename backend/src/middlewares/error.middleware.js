const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { cleanupRequestFiles } = require('../utils/file');
const { nodeEnv } = require('../config/env');
const { MAX_FILE_SIZE } = require('../config/upload');

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = async (err, req, res, next) => {
  // A failed request must not leave orphaned uploads behind
  await cleanupRequestFiles(req);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `${err.field}: file must be smaller than ${MAX_FILE_SIZE / (1024 * 1024)} MB`
        : `${err.field || 'File'}: ${err.message}`;
  }
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }
  if (err.code === 11000) {
    statusCode = 409;
    message = `${Object.keys(err.keyValue).join(', ')} already exists`;
  }
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  if (statusCode >= 500) console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [],
    ...(nodeEnv === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
