const boardRepository = require('../repositories/board.repository');
const taskRepository = require('../repositories/task.repository');
const workspaceRepository = require('../repositories/workspace.repository');
const recentlyViewedRepository = require('../repositories/recentlyViewed.repository');
const activityService = require('./activity.service');
const ApiError = require('../utils/ApiError');
const { ACTIVITY_ACTIONS } = require('../constants/enums');
const Task = require('../models/Task');

async function assertOwnedBoard(boardId, ownerId) {
  const board = await boardRepository.findByIdAndOwner(boardId, ownerId);
  if (!board) throw ApiError.notFound('Board not found');
  return board;
}

async function listBoards(ownerId, { includeArchived } = {}) {
  return boardRepository.listByOwner(ownerId, { includeArchived });
}

async function createBoard(ownerId, payload) {
  if (payload.workspace) {
    const workspace = await workspaceRepository.findByIdAndOwner(payload.workspace, ownerId);
    if (!workspace) throw ApiError.badRequest('Workspace not found');
  }

  const board = await boardRepository.create({ ...payload, owner: ownerId });
  await activityService.record({
    user: ownerId,
    board: board._id,
    action: ACTIVITY_ACTIONS.BOARD_CREATED,
    meta: { title: board.title },
  });
  return board;
}

async function getBoardWithTasks(boardId, ownerId) {
  const board = await assertOwnedBoard(boardId, ownerId);
  const tasks = await taskRepository.listByBoard(board._id);
  await recentlyViewedRepository.touch(ownerId, board._id);
  return { board, tasks };
}

async function updateBoard(boardId, ownerId, payload) {
  const existing = await assertOwnedBoard(boardId, ownerId);
  const oldColumns = existing.columns;

  const board = await boardRepository.updateByIdAndOwner(boardId, ownerId, payload);
  if (!board) throw ApiError.notFound('Board not found');

  if (Array.isArray(payload.columns)) {
    const newColumns = board.columns;
    await Promise.all(
      oldColumns.map(async (oldName, idx) => {
        if (newColumns.includes(oldName)) return;
        const target = newColumns[idx] || newColumns[0];
        await Task.updateMany({ board: board._id, column: oldName }, { column: target });
      })
    );
  }

  await activityService.record({
    user: ownerId,
    board: board._id,
    action: ACTIVITY_ACTIONS.BOARD_UPDATED,
    meta: { fields: Object.keys(payload) },
  });

  return board;
}

async function setArchived(boardId, ownerId, isArchived) {
  const board = await boardRepository.setArchived(boardId, ownerId, isArchived);
  if (!board) throw ApiError.notFound('Board not found');

  await activityService.record({
    user: ownerId,
    board: board._id,
    action: ACTIVITY_ACTIONS.BOARD_ARCHIVED,
    meta: { isArchived },
  });

  return board;
}

async function deleteBoard(boardId, ownerId) {
  const board = await boardRepository.softDeleteByIdAndOwner(boardId, ownerId);
  if (!board) throw ApiError.notFound('Board not found');

  await Task.updateMany({ board: board._id }, { isDeleted: true, deletedAt: new Date() });

  await activityService.record({
    user: ownerId,
    board: board._id,
    action: ACTIVITY_ACTIONS.BOARD_DELETED,
  });

  return board;
}

module.exports = {
  assertOwnedBoard,
  listBoards,
  createBoard,
  getBoardWithTasks,
  updateBoard,
  setArchived,
  deleteBoard,
};
