/**
 * WHY: Every async controller used to need its own try/catch or errors
 * would crash the process (unhandled rejection). Wrapping once here means
 * controllers can `throw new ApiError(...)` freely and it always reaches
 * the centralized error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
