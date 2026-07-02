const express = require('express');
const mongoose = require('mongoose');

const authRoutes = require('./auth.routes');
const boardRoutes = require('./board.routes');
const taskRoutes = require('./task.routes');
const workspaceRoutes = require('./workspace.routes');
const analyticsRoutes = require('./analytics.routes');
const notificationRoutes = require('./notification.routes');

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness + database connectivity check
 *     responses:
 *       200:
 *         description: API and database are reachable
 */
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    success: true,
    message: 'TaskFlow API is running',
    data: {
      uptime: process.uptime(),
      db: dbState === 1 ? 'connected' : 'disconnected',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/boards', boardRoutes);
router.use('/tasks', taskRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
