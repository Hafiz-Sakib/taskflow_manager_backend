const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const workspaceService = require('../services/workspace.service');

const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.listWorkspaces(req.user._id);
  new ApiResponse(200, workspaces).send(res);
});

const createWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.createWorkspace(req.user._id, req.body);
  new ApiResponse(201, workspace, 'Workspace created').send(res);
});

const updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.updateWorkspace(req.params.id, req.user._id, req.body);
  new ApiResponse(200, workspace, 'Workspace updated').send(res);
});

const deleteWorkspace = asyncHandler(async (req, res) => {
  await workspaceService.deleteWorkspace(req.params.id, req.user._id);
  new ApiResponse(200, null, 'Workspace deleted').send(res);
});

module.exports = { listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace };
