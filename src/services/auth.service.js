const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/tokens');

/**
 * WHY (old → new):
 *   Old: routes/auth.js signed one 7-day token and handed it straight to
 *   the client with no way to revoke it before expiry.
 *   New: login/register issue a short-lived access token (returned in the
 *   JSON body, kept in memory client-side) + a rotating refresh token
 *   (httpOnly cookie, hash stored server-side). This is the standard
 *   "silent refresh" pattern: a stolen access token is useless within
 *   minutes, and logout / rotation actually revokes the refresh token
 *   instead of just letting it float until expiry.
 */
async function issueSession(user) {
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);
  await userRepository.setRefreshTokenHash(user._id, hashToken(refreshToken));
  return { accessToken, refreshToken };
}

async function register({ name, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw ApiError.conflict('User with this email already exists');
  }

  const user = await userRepository.create({ name, email, password });
  const tokens = await issueSession(user);
  return { user: user.toSafeObject(), ...tokens };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email, { withPassword: true });

  if (!user || !(await user.matchPassword(password))) {
    logger.warn(`Failed login attempt for ${email}`);
    throw ApiError.unauthorized('Invalid email or password');
  }

  const tokens = await issueSession(user);
  return { user: user.toSafeObject(), ...tokens };
}

async function refresh(refreshTokenFromCookie) {
  if (!refreshTokenFromCookie) {
    throw ApiError.unauthorized('No refresh token provided');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenFromCookie);
  } catch (err) {
    throw ApiError.unauthorized('Refresh token invalid or expired');
  }

  const user = await userRepository.findById(decoded.id, { withRefreshToken: true });
  if (!user || !user.refreshTokenHash) {
    throw ApiError.unauthorized('Session no longer valid, please log in again');
  }

  if (hashToken(refreshTokenFromCookie) !== user.refreshTokenHash) {
    // Token doesn't match the last-issued one — likely reused after
    // rotation (possible token theft). Revoke the session defensively.
    await userRepository.clearRefreshTokenHash(user._id);
    throw ApiError.unauthorized('Session invalid, please log in again');
  }

  // Rotation: every refresh issues a brand new refresh token and
  // invalidates the previous one.
  const tokens = await issueSession(user);
  return { user: user.toSafeObject(), ...tokens };
}

async function logout(userId) {
  if (userId) {
    await userRepository.clearRefreshTokenHash(userId);
  }
}

async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toSafeObject();
}

module.exports = { register, login, refresh, logout, getMe };
