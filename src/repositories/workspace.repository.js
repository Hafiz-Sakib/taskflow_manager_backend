const Workspace = require('../models/Workspace');

const workspaceRepository = {
  create: (data) => Workspace.create(data),
  listByOwner: (ownerId) => Workspace.find({ owner: ownerId }).sort({ createdAt: -1 }).lean(),
  findByIdAndOwner: (id, ownerId) => Workspace.findOne({ _id: id, owner: ownerId }),
  updateByIdAndOwner: (id, ownerId, data) =>
    Workspace.findOneAndUpdate({ _id: id, owner: ownerId }, data, { new: true, runValidators: true }),
  softDeleteByIdAndOwner: (id, ownerId) =>
    Workspace.findOneAndUpdate({ _id: id, owner: ownerId }, { isDeleted: true, deletedAt: new Date() }, { new: true }),
};

module.exports = workspaceRepository;
