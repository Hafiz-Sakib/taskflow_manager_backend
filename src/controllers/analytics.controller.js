const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const analyticsService = require('../services/analytics.service');
const boardService = require('../services/board.service');
const recentlyViewedService = require('../services/recentlyViewed.service');

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDashboard(req.user._id);
  new ApiResponse(200, stats).send(res);
});

const getBoardStats = asyncHandler(async (req, res) => {
  const board = await boardService.assertOwnedBoard(req.params.id, req.user._id);
  const stats = await analyticsService.getBoardStats(board._id);
  new ApiResponse(200, stats).send(res);
});

const getSystemStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getSystemStats();
  new ApiResponse(200, stats).send(res);
});

const getRecentlyViewed = asyncHandler(async (req, res) => {
  const recent = await recentlyViewedService.listRecent(req.user._id);
  new ApiResponse(200, recent).send(res);
});

module.exports = { getDashboard, getBoardStats, getSystemStats, getRecentlyViewed };
