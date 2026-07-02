const express = require('express');
const taskController = require('../controllers/task.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTaskSchema,
  updateTaskSchema,
  bulkReorderSchema,
  addCommentSchema,
  addAttachmentSchema,
  addChecklistItemSchema,
  toggleChecklistItemSchema,
} = require('../validators/task.validator');

const router = express.Router();

router.use(protect);

router.get('/', taskController.listTasks);
router.post('/', validate(createTaskSchema), taskController.createTask);
router.put('/reorder/bulk', validate(bulkReorderSchema), taskController.bulkReorder);
router.put('/:id', validate(updateTaskSchema), taskController.updateTask);
router.patch('/:id/archive', taskController.archiveTask);
router.delete('/:id', taskController.deleteTask);
router.post('/:id/comments', validate(addCommentSchema), taskController.addComment);
router.post('/:id/attachments', validate(addAttachmentSchema), taskController.addAttachment);
router.post('/:id/checklist', validate(addChecklistItemSchema), taskController.addChecklistItem);
router.patch('/:id/checklist/:itemId', validate(toggleChecklistItemSchema), taskController.updateChecklistItem);
router.delete('/:id/checklist/:itemId', taskController.removeChecklistItem);

module.exports = router;
