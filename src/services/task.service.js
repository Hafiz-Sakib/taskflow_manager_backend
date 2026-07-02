const taskRepository = require('../repositories/task.repository');
const boardRepository = require('../repositories/board.repository');
const Task = require('../models/Task');
const activityService = require('./activity.service');
const ApiError = require('../utils/ApiError');
const { ACTIVITY_ACTIONS } = require('../constants/enums');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

async function assertOwnedBoard(boardId, ownerId) {
  const board = await boardRepository.findByIdAndOwner(boardId, ownerId);
  if (!board) throw ApiError.notFound('Board not found');
  return board;
}

async function assertOwnedTask(taskId, ownerId) {
  const task = await taskRepository.findByIdPopulatedBoard(taskId);
  if (!task || !task.board || String(task.board.owner) !== String(ownerId)) {
    throw ApiError.notFound('Task not found');
  }
  return task;
}

function normalizeDueDate(dueDate) {
  if (dueDate === '' || dueDate === undefined) return undefined;
  if (dueDate === null) return null;
  return new Date(dueDate);
}

async function createTask(ownerId, payload) {
  const board = await assertOwnedBoard(payload.board, ownerId);
  const column = payload.column || board.columns[0];

  const count = await taskRepository.countByBoardAndColumn(board._id, column);

  const task = await taskRepository.create({
    ...payload,
    column,
    dueDate: normalizeDueDate(payload.dueDate),
    order: count,
  });

  await activityService.record({
    user: ownerId,
    board: board._id,
    task: task._id,
    action: ACTIVITY_ACTIONS.TASK_CREATED,
    meta: { title: task.title, column },
  });

  return task;
}

/**
 * WHY (old → new): the old PUT /tasks/:id did `Object.assign(task,
 * req.body)` — meaning any field the client sent, including `board`,
 * silently overwrote the document with no validation that the *new*
 * board was owned by the same user. This version explicitly re-validates
 * ownership of the target board on every reassignment, and logs a
 * "moved" activity entry when the column changes.
 */
async function updateTask(taskId, ownerId, payload) {
  const task = await assertOwnedTask(taskId, ownerId);
  const previousColumn = task.column;

  const updates = { ...payload };

  if (updates.board && String(updates.board) !== String(task.board._id)) {
    await assertOwnedBoard(updates.board, ownerId);
  }

  if ('dueDate' in updates) {
    updates.dueDate = normalizeDueDate(updates.dueDate);
  }

  const updated = await taskRepository.updateById(taskId, updates);

  if (updates.column && updates.column !== previousColumn) {
    await activityService.record({
      user: ownerId,
      board: task.board._id,
      task: updated._id,
      action: ACTIVITY_ACTIONS.TASK_MOVED,
      meta: { from: previousColumn, to: updates.column },
    });
  } else {
    await activityService.record({
      user: ownerId,
      board: task.board._id,
      task: updated._id,
      action: ACTIVITY_ACTIONS.TASK_UPDATED,
      meta: { fields: Object.keys(payload) },
    });
  }

  return updated;
}

async function deleteTask(taskId, ownerId) {
  const task = await assertOwnedTask(taskId, ownerId);
  await taskRepository.softDeleteById(taskId);

  await activityService.record({
    user: ownerId,
    board: task.board._id,
    task: task._id,
    action: ACTIVITY_ACTIONS.TASK_DELETED,
    meta: { title: task.title },
  });
}

async function setArchived(taskId, ownerId, isArchived) {
  const task = await assertOwnedTask(taskId, ownerId);
  const updated = await taskRepository.setArchived(taskId, isArchived);

  await activityService.record({
    user: ownerId,
    board: task.board._id,
    task: task._id,
    action: ACTIVITY_ACTIONS.TASK_ARCHIVED,
    meta: { isArchived },
  });

  return updated;
}

/**
 * WHY: the old bulk-reorder endpoint trusted whatever task ids the client
 * sent with zero ownership check — any authenticated user could reorder or
 * relocate ANY task in the database just by knowing its id. This version
 * loads every referenced task with its board populated first, and rejects
 * the whole batch (403) unless every single one belongs to the caller.
 */
async function bulkReorder(ownerId, tasks) {
  const taskIds = tasks.map((t) => t._id);
  const owned = await Task.find({ _id: { $in: taskIds } }).populate('board');

  const allOwned =
    owned.length === taskIds.length && owned.every((t) => t.board && String(t.board.owner) === String(ownerId));

  if (!allOwned) {
    throw ApiError.forbidden('Not authorized to reorder one or more tasks');
  }

  const bulkOps = tasks.map((t) => ({
    updateOne: {
      filter: { _id: t._id },
      update: { column: t.column, order: t.order },
    },
  }));

  await taskRepository.bulkWrite(bulkOps);
}

async function listTasks(ownerId, query) {
  const { page, limit, skip } = parsePagination(query);

  let boardIds;
  if (query.board) {
    await assertOwnedBoard(query.board, ownerId);
  } else {
    const boards = await boardRepository.listByOwner(ownerId, { includeArchived: true });
    boardIds = boards.map((b) => b._id);
  }

  const { items, total } = await taskRepository.findWithFilters({
    board: query.board,
    boardIds,
    search: query.search,
    priority: query.priority,
    column: query.column,
    isArchived: query.isArchived === 'true' ? true : query.isArchived === 'false' ? false : undefined,
    sort: query.sort,
    skip,
    limit,
  });

  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

async function addComment(taskId, ownerId, text) {
  const task = await assertOwnedTask(taskId, ownerId);
  task.comments.push({ author: ownerId, text });
  await task.save();
  return task;
}

async function addAttachment(taskId, ownerId, { name, url }) {
  const task = await assertOwnedTask(taskId, ownerId);
  task.attachments.push({ name, url, addedBy: ownerId });
  await task.save();
  return task;
}

async function addChecklistItem(taskId, ownerId, text) {
  const task = await assertOwnedTask(taskId, ownerId);
  task.checklist.push({ text, done: false });
  await task.save();
  return task;
}

async function updateChecklistItem(taskId, itemId, ownerId, updates) {
  const task = await assertOwnedTask(taskId, ownerId);
  const item = task.checklist.id(itemId);
  if (!item) throw ApiError.notFound('Checklist item not found');
  if (updates.done !== undefined) item.done = updates.done;
  if (updates.text !== undefined) item.text = updates.text;
  await task.save();
  return task;
}

async function removeChecklistItem(taskId, itemId, ownerId) {
  const task = await assertOwnedTask(taskId, ownerId);
  const item = task.checklist.id(itemId);
  if (!item) throw ApiError.notFound('Checklist item not found');
  item.deleteOne();
  await task.save();
  return task;
}

module.exports = {
  assertOwnedTask,
  createTask,
  updateTask,
  deleteTask,
  setArchived,
  bulkReorder,
  listTasks,
  addComment,
  addAttachment,
  addChecklistItem,
  updateChecklistItem,
  removeChecklistItem,
};
