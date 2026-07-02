const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');
const { refreshCookieOptions } = require('../utils/cookieOptions');
const { verifyRefreshToken } = require('../utils/tokens');

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
}

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  setRefreshCookie(res, refreshToken);
  new ApiResponse(201, { user, accessToken }, 'Account created').send(res);
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  new ApiResponse(200, { user, accessToken }, 'Logged in').send(res);
});

const refresh = asyncHandler(async (req, res) => {
  const incoming = req.signedCookies?.refreshToken;
  const { user, accessToken, refreshToken } = await authService.refresh(incoming);
  setRefreshCookie(res, refreshToken);
  new ApiResponse(200, { user, accessToken }, 'Session refreshed').send(res);
});

const logout = asyncHandler(async (req, res) => {
  const incoming = req.signedCookies?.refreshToken;

  if (incoming) {
    try {
      const decoded = verifyRefreshToken(incoming);
      await authService.logout(decoded.id);
    } catch (err) {
      // Token already invalid/expired — nothing to revoke server-side,
      // just fall through and clear the cookie below.
    }
  }

  res.clearCookie('refreshToken', { path: '/api/auth' });
  new ApiResponse(200, null, 'Logged out').send(res);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  new ApiResponse(200, user).send(res);
});

module.exports = { register, login, refresh, logout, me };
