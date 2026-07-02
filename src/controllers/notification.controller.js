const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../services/notification.service');

const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listForUser(req.user._id, req.query);
  new ApiResponse(200, result).send(res);
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.user._id);
  new ApiResponse(200, notification, 'Notification marked as read').send(res);
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);
  new ApiResponse(200, null, 'All notifications marked as read').send(res);
});

module.exports = { listNotifications, markRead, markAllRead };
