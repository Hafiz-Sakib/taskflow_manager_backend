const RecentlyViewed = require('../models/RecentlyViewed');

const recentlyViewedRepository = {
  touch: (userId, boardId) =>
    RecentlyViewed.findOneAndUpdate(
      { user: userId, board: boardId },
      { viewedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),

  listByUser: (userId, limit = 10) =>
    RecentlyViewed.find({ user: userId })
      .sort({ viewedAt: -1 })
      .limit(limit)
      .populate('board')
      .lean(),
};

module.exports = recentlyViewedRepository;
