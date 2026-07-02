const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const boardService = require('../services/board.service');
const activityService = require('../services/activity.service');

const listBoards = asyncHandler(async (req, res) => {
  const boards = await boardService.listBoards(req.user._id, { includeArchived: req.query.includeArchived === 'true' });
  new ApiResponse(200, boards).send(res);
});

const createBoard = asyncHandler(async (req, res) => {
  const board = await boardService.createBoard(req.user._id, req.body);
  new ApiResponse(201, board, 'Board created').send(res);
});

const getBoard = asyncHandler(async (req, res) => {
  const { board, tasks } = await boardService.getBoardWithTasks(req.params.id, req.user._id);
  new ApiResponse(200, { board, tasks }).send(res);
});

const updateBoard = asyncHandler(async (req, res) => {
  const board = await boardService.updateBoard(req.params.id, req.user._id, req.body);
  new ApiResponse(200, board, 'Board updated').send(res);
});

const archiveBoard = asyncHandler(async (req, res) => {
  const board = await boardService.setArchived(req.params.id, req.user._id, req.body.isArchived !== false);
  new ApiResponse(200, board, board.isArchived ? 'Board archived' : 'Board restored').send(res);
});

const deleteBoard = asyncHandler(async (req, res) => {
  await boardService.deleteBoard(req.params.id, req.user._id);
  new ApiResponse(200, null, 'Board deleted').send(res);
});

const getActivity = asyncHandler(async (req, res) => {
  await boardService.assertOwnedBoard(req.params.id, req.user._id);
  const result = await activityService.listForBoard(req.params.id, req.query);
  new ApiResponse(200, result).send(res);
});

module.exports = { listBoards, createBoard, getBoard, updateBoard, archiveBoard, deleteBoard, getActivity };
