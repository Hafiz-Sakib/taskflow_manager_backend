const ActivityLog = require('../models/ActivityLog');

const activityRepository = {
  record: (data) => ActivityLog.create(data),

  listByBoard: (boardId, { skip, limit }) =>
    ActivityLog.find({ board: boardId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email')
      .lean(),

  countByBoard: (boardId) => ActivityLog.countDocuments({ board: boardId }),
};

module.exports = activityRepository;
