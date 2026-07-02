const Notification = require('../models/Notification');

const notificationRepository = {
  upsert: (filter, data) =>
    Notification.findOneAndUpdate(filter, { $set: data }, { upsert: true, new: true, setDefaultsOnInsert: true }),

  listByUser: (userId, { skip, limit }) =>
    Notification.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

  countByUser: (userId) => Notification.countDocuments({ user: userId }),

  countUnread: (userId) => Notification.countDocuments({ user: userId, isRead: false }),

  markRead: (id, userId) =>
    Notification.findOneAndUpdate({ _id: id, user: userId }, { isRead: true }, { new: true }),

  markAllRead: (userId) => Notification.updateMany({ user: userId, isRead: false }, { isRead: true }),
};

module.exports = notificationRepository;
