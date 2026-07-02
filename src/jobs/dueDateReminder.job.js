const cron = require('node-cron');
const notificationService = require('../services/notification.service');
const logger = require('../config/logger');

/**
 * WHY: Notifications need to exist before the frontend can show them —
 * something has to periodically ask "what's due today or overdue?" and
 * write rows for it. Running this hourly (rather than on every request)
 * keeps it cheap; the unique index on Notification means re-runs are
 * idempotent.
 */
function scheduleDueDateReminders() {
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await notificationService.generateDueDateNotifications();
      logger.info(`Due-date reminder job processed ${count} task(s)`);
    } catch (err) {
      logger.error(`Due-date reminder job failed: ${err.message}`);
    }
  });
}

module.exports = scheduleDueDateReminders;
