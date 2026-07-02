const Board = require('../models/Board');

const boardRepository = {
  create: (data) => Board.create(data),

  findByIdAndOwner: (id, ownerId) => Board.findOne({ _id: id, owner: ownerId }),

  findByIdAndOwnerLean: (id, ownerId) => Board.findOne({ _id: id, owner: ownerId }).lean(),

  listByOwner: (ownerId, { includeArchived = false } = {}) => {
    const filter = { owner: ownerId };
    if (!includeArchived) filter.isArchived = false;
    return Board.find(filter).sort({ createdAt: -1 }).lean();
  },

  updateByIdAndOwner: (id, ownerId, data) =>
    Board.findOneAndUpdate({ _id: id, owner: ownerId }, data, { new: true, runValidators: true }),

  softDeleteByIdAndOwner: (id, ownerId) =>
    Board.findOneAndUpdate({ _id: id, owner: ownerId }, { isDeleted: true, deletedAt: new Date() }, { new: true }),

  setArchived: (id, ownerId, isArchived) =>
    Board.findOneAndUpdate({ _id: id, owner: ownerId }, { isArchived }, { new: true }),

  countByOwner: (ownerId) => Board.countDocuments({ owner: ownerId }),

  countAll: () => Board.countDocuments(),
};

module.exports = boardRepository;
