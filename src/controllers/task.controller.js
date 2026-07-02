const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const taskService = require('../services/task.service');

const listTasks = asyncHandler(async (req, res) => {
  const result = await taskService.listTasks(req.user._id, req.query);
  new ApiResponse(200, result).send(res);
});

const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.user._id, req.body);
  new ApiResponse(201, task, 'Task created').send(res);
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.user._id, req.body);
  new ApiResponse(200, task, 'Task updated').send(res);
});

const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user._id);
  new ApiResponse(200, null, 'Task deleted').send(res);
});

const archiveTask = asyncHandler(async (req, res) => {
  const task = await taskService.setArchived(req.params.id, req.user._id, req.body.isArchived !== false);
  new ApiResponse(200, task, task.isArchived ? 'Task archived' : 'Task restored').send(res);
});

const bulkReorder = asyncHandler(async (req, res) => {
  await taskService.bulkReorder(req.user._id, req.body.tasks);
  new ApiResponse(200, null, 'Tasks reordered successfully').send(res);
});

const addComment = asyncHandler(async (req, res) => {
  const task = await taskService.addComment(req.params.id, req.user._id, req.body.text);
  new ApiResponse(201, task, 'Comment added').send(res);
});

const addAttachment = asyncHandler(async (req, res) => {
  const task = await taskService.addAttachment(req.params.id, req.user._id, req.body);
  new ApiResponse(201, task, 'Attachment added').send(res);
});

const addChecklistItem = asyncHandler(async (req, res) => {
  const task = await taskService.addChecklistItem(req.params.id, req.user._id, req.body.text);
  new ApiResponse(201, task, 'Checklist item added').send(res);
});

const updateChecklistItem = asyncHandler(async (req, res) => {
  const task = await taskService.updateChecklistItem(req.params.id, req.params.itemId, req.user._id, req.body);
  new ApiResponse(200, task, 'Checklist item updated').send(res);
});

const removeChecklistItem = asyncHandler(async (req, res) => {
  const task = await taskService.removeChecklistItem(req.params.id, req.params.itemId, req.user._id);
  new ApiResponse(200, task, 'Checklist item removed').send(res);
});

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  archiveTask,
  bulkReorder,
  addComment,
  addAttachment,
  addChecklistItem,
  updateChecklistItem,
  removeChecklistItem,
};
