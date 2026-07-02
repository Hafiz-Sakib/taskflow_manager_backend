const mongoose = require('mongoose');
const { ACTIVITY_ACTIONS } = require('../constants/enums');

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    action: { type: String, enum: Object.values(ACTIVITY_ACTIONS), required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ board: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
