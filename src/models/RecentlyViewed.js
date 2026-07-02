const mongoose = require('mongoose');

const recentlyViewedSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

recentlyViewedSchema.index({ user: 1, board: 1 }, { unique: true });
recentlyViewedSchema.index({ user: 1, viewedAt: -1 });

module.exports = mongoose.model('RecentlyViewed', recentlyViewedSchema);
