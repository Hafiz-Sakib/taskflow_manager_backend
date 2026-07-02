require('dotenv').config();

const env = require('./src/config/env');
const logger = require('./src/config/logger');
const connectDB = require('./src/config/db');
const app = require('./src/app');
const scheduleDueDateReminders = require('./src/jobs/dueDateReminder.job');

async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`TaskFlow API running on port ${env.PORT} [${env.NODE_ENV}]`);
    if (env.NODE_ENV !== 'test') {
      logger.info(`API docs available at http://localhost:${env.PORT}/api/docs`);
    }
  });

  if (env.NODE_ENV !== 'test') {
    scheduleDueDateReminders();
  }

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('HTTP server and MongoDB connection closed');
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection: ${reason?.stack || reason}`);
  });

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.stack}`);
    process.exit(1);
  });
}

start();
