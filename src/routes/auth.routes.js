const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const router = express.Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201: { description: Account created }
 *       400: { description: Validation failed }
 *       409: { description: Email already in use }
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in and receive an access token (refresh token set as httpOnly cookie)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Logged in }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate the refresh token cookie and issue a new access token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Session refreshed }
 *       401: { description: Refresh token missing, invalid, or expired }
 */
router.post('/refresh', authLimiter, authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current refresh session
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authorized }
 */
router.get('/me', protect, authController.me);

module.exports = router;
