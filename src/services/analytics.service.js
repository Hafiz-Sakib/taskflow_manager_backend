const boardRepository = require('../repositories/board.repository');
const taskRepository = require('../repositories/task.repository');
const userRepository = require('../repositories/user.repository');
const Task = require('../models/Task');

/**
 * WHY (old → new): the old frontend computed "dashboard stats" by fetching
 * every board's full task list client-side and reducing it in JS — an
 * N+1 pattern that gets slower with every board a user creates. This
 * pushes the aggregation into MongoDB with a single `$facet` pipeline,
 * so the work scales with the database engine instead of the browser.
 */
async function getDashboard(userId) {
  const boards = await boardRepository.listByOwner(userId, { includeArchived: true });
  const boardIds = boards.map((b) => b._id);

  if (boardIds.length === 0) {
    return {
      boardCount: 0,
      totalTasks: 0,
      tasksByPriority: {},
      tasksByColumn: {},
      overdueCount: 0,
      completionRate: 0,
    };
  }

  const [result] = await taskRepository.aggregateForBoards(boardIds);

  const totalTasks = result.total[0]?.count || 0;
  const doneCount = result.byColumn.find((c) => String(c._id).toLowerCase() === 'done')?.count || 0;

  return {
    boardCount: boards.length,
    totalTasks,
    tasksByPriority: Object.fromEntries(result.byPriority.map((p) => [p._id, p.count])),
    tasksByColumn: Object.fromEntries(result.byColumn.map((c) => [c._id, c.count])),
    overdueCount: result.overdue[0]?.count || 0,
    completionRate: totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0,
  };
}

async function getBoardStats(boardId) {
  const [result] = await Task.aggregate([
    { $match: { board: boardId, isDeleted: { $ne: true } } },
    {
      $facet: {
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        byColumn: [{ $group: { _id: '$column', count: { $sum: 1 } } }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  return {
    totalTasks: result.total[0]?.count || 0,
    tasksByPriority: Object.fromEntries(result.byPriority.map((p) => [p._id, p.count])),
    tasksByColumn: Object.fromEntries(result.byColumn.map((c) => [c._id, c.count])),
  };
}

async function getSystemStats() {
  const [userCount, boardCount, taskCount] = await Promise.all([
    userRepository.countAll(),
    boardRepository.countAll(),
    taskRepository.countAll(),
  ]);
  return { userCount, boardCount, taskCount };
}

module.exports = { getDashboard, getBoardStats, getSystemStats };
