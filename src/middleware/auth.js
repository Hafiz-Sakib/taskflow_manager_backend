const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const userRepository = require('../repositories/user.repository');

/**
 * WHY: Previously this checked `startsWith('Bearer')` (missing the space,
 * so "Bearerxxx" would pass) and threw generic 401s with no distinction
 * between "no token", "bad token", and "user deleted since token issued".
 * Splitting those cases out makes client-side handling (e.g. silent
 * refresh vs force logout) possible.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Not authorized, no token provided');
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Not authorized, token invalid or expired');
  }

  if (decoded.type !== 'access') {
    throw ApiError.unauthorized('Not authorized, wrong token type');
  }

  const user = await userRepository.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized('Not authorized, user no longer exists');
  }

  req.user = user;
  next();
});

/**
 * WHY: Role-based authorization is required by the spec even though this
 * app currently only exposes one admin-only endpoint (system analytics).
 * Keeping it generic (`authorize('admin')`, `authorize('admin', 'user')`)
 * means new privileged routes can opt in without duplicating logic.
 */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };

module.exports = { protect, authorize };
