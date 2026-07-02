const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../constants/enums');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// One notification per task/type/day — the reminder job upserts on this key
// so re-running the cron doesn't spam duplicate notifications.
notificationSchema.index({ user: 1, task: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Notification', notificationSchema);
