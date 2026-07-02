const workspaceRepository = require('../repositories/workspace.repository');
const ApiError = require('../utils/ApiError');

async function listWorkspaces(ownerId) {
  return workspaceRepository.listByOwner(ownerId);
}

async function createWorkspace(ownerId, payload) {
  return workspaceRepository.create({ ...payload, owner: ownerId });
}

async function updateWorkspace(id, ownerId, payload) {
  const workspace = await workspaceRepository.updateByIdAndOwner(id, ownerId, payload);
  if (!workspace) throw ApiError.notFound('Workspace not found');
  return workspace;
}

async function deleteWorkspace(id, ownerId) {
  const workspace = await workspaceRepository.softDeleteByIdAndOwner(id, ownerId);
  if (!workspace) throw ApiError.notFound('Workspace not found');
  return workspace;
}

module.exports = { listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace };
