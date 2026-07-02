const PRIORITIES = Object.freeze(['low', 'medium', 'high']);

const DEFAULT_COLUMNS = Object.freeze(['To Do', 'In Progress', 'Done']);

const NOTIFICATION_TYPES = Object.freeze({
  DUE_TODAY: 'due_today',
  OVERDUE: 'overdue',
});

const ACTIVITY_ACTIONS = Object.freeze({
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_MOVED: 'task_moved',
  TASK_DELETED: 'task_deleted',
  TASK_ARCHIVED: 'task_archived',
  BOARD_CREATED: 'board_created',
  BOARD_UPDATED: 'board_updated',
  BOARD_ARCHIVED: 'board_archived',
  BOARD_DELETED: 'board_deleted',
});

module.exports = { PRIORITIES, DEFAULT_COLUMNS, NOTIFICATION_TYPES, ACTIVITY_ACTIONS };
