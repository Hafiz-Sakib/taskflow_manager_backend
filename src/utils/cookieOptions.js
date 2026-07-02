const env = require('../config/env');

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN_MS,
    path: '/api/auth',
    signed: true,
  };
}

module.exports = { refreshCookieOptions };
