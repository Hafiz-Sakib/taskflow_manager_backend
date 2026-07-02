const notificationRepository = require('../repositories/notification.repository');
const Task = require('../models/Task');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { NOTIFICATION_TYPES } = require('../constants/enums');

async function listForUser(userId, query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total, unreadCount] = await Promise.all([
    notificationRepository.listByUser(userId, { skip, limit }),
    notificationRepository.countByUser(userId),
    notificationRepository.countUnread(userId),
  ]);
  return { items, unreadCount, meta: buildPaginationMeta({ page, limit, total }) };
}

async function markRead(id, userId) {
  return notificationRepository.markRead(id, userId);
}

async function markAllRead(userId) {
  return notificationRepository.markAllRead(userId);
}

/**
 * WHY: This is the job the cron scheduler calls. It finds every
 * non-archived, non-done task due today or already overdue, and upserts
 * one notification per (user, task, type) — the unique index on the model
 * means re-running this every hour never creates duplicates.
 */
async function generateDueDateNotifications() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const tasks = await Task.find({
    dueDate: { $ne: null },
    isArchived: false,
    column: { $ne: 'Done' },
  }).populate('board');

  let created = 0;

  for (const task of tasks) {
    if (!task.board) continue;
    const owner = task.board.owner;
    const due = new Date(task.dueDate);

    let type = null;
    if (due < startOfToday) type = NOTIFICATION_TYPES.OVERDUE;
    else if (due >= startOfToday && due <= endOfToday) type = NOTIFICATION_TYPES.DUE_TODAY;

    if (!type) continue;

    const message =
      type === NOTIFICATION_TYPES.OVERDUE
        ? `"${task.title}" is overdue`
        : `"${task.title}" is due today`;

    await notificationRepository.upsert(
      { user: owner, task: task._id, type },
      { user: owner, task: task._id, board: task.board._id, type, message }
    );
    created += 1;
  }

  return created;
}

module.exports = { listForUser, markRead, markAllRead, generateDueDateNotifications };
