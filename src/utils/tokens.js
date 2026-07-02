const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * WHY: Single access token used to live for 7 days with no way to revoke it
 * short of changing the secret for everyone. Splitting into a short-lived
 * access token + rotating refresh token means a stolen access token expires
 * fast, and refresh tokens can be individually revoked (logout, rotation).
 */

function signAccessToken(userId, role) {
  return jwt.sign({ id: userId, role, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ id: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// Refresh tokens are stored hashed (like passwords) so a DB leak doesn't
// hand out valid tokens directly.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
