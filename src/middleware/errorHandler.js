const env = require('../config/env');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
      error = ApiError.badRequest('Validation failed', errors);
    } else if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      error = ApiError.conflict(`${field} already in use`);
    } else if (error.name === 'CastError') {
      error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`);
    } else {
      error = ApiError.internal(env.NODE_ENV === 'production' ? undefined : error.message);
    }
  }

  if (!error.isOperational) {
    logger.error(err.stack || err.message);
  } else if (error.statusCode >= 500) {
    logger.error(error.message);
  } else if (error.statusCode === 401 || error.statusCode === 403) {
    logger.warn(`Auth failure: ${error.message} — ${req.method} ${req.originalUrl}`);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Something went wrong on the server',
    errors: error.errors || [],
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
