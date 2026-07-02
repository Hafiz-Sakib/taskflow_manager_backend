/**
 * WHY: Before, every route caught errors ad-hoc and hand-rolled
 * `res.status(x).json({ message })`. That means status codes and shapes
 * drift between routes over time. ApiError lets services/controllers throw
 * a typed error and let ONE error handler decide how to serialize it.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = [], isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational; // expected error vs programming bug
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Not authorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static internal(message = 'Something went wrong on the server') {
    return new ApiError(500, message, [], false);
  }
}

module.exports = ApiError;
