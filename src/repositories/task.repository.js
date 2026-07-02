const Task = require('../models/Task');

const taskRepository = {
  create: (data) => Task.create(data),

  findById: (id) => Task.findById(id),

  findByIdPopulatedBoard: (id) => Task.findById(id).populate('board'),

  listByBoard: (boardId, { includeArchived = false } = {}) => {
    const filter = { board: boardId };
    if (!includeArchived) filter.isArchived = false;
    return Task.find(filter).sort({ order: 1 }).lean();
  },

  countByBoardAndColumn: (boardId, column) => Task.countDocuments({ board: boardId, column }),

  updateById: (id, data) => Task.findByIdAndUpdate(id, data, { new: true, runValidators: true }),

  softDeleteById: (id) => Task.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }),

  setArchived: (id, isArchived) => Task.findByIdAndUpdate(id, { isArchived }, { new: true }),

  bulkWrite: (ops) => Task.bulkWrite(ops),

  updateManyByBoardAndColumn: (boardId, column, data) =>
    Task.updateMany({ board: boardId, column }, data),

  findWithFilters: async ({ board, boardIds, search, priority, column, isArchived, sort, skip, limit }) => {
    const filter = {};
    if (board) filter.board = board;
    if (boardIds) filter.board = { $in: boardIds };
    if (priority) filter.priority = priority;
    if (column) filter.column = column;
    filter.isArchived = isArchived ?? false;
    if (search) filter.$text = { $search: search };

    const sortMap = {
      priority: { priority: 1 },
      dueDate: { dueDate: 1 },
      newest: { createdAt: -1 },
      manual: { order: 1 },
    };

    const [items, total] = await Promise.all([
      Task.find(filter)
        .sort(sortMap[sort] || sortMap.manual)
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
    ]);

    return { items, total };
  },

  aggregateForBoards: (boardIds) =>
    Task.aggregate([
      { $match: { board: { $in: boardIds }, isDeleted: { $ne: true } } },
      {
        $facet: {
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          byColumn: [{ $group: { _id: '$column', count: { $sum: 1 } } }],
          total: [{ $count: 'count' }],
          overdue: [
            { $match: { dueDate: { $lt: new Date() }, column: { $ne: 'Done' } } },
            { $count: 'count' },
          ],
        },
      },
    ]),

  countAll: () => Task.countDocuments(),
};

module.exports = taskRepository;
