const express = require('express');
const workspaceController = require('../controllers/workspace.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createWorkspaceSchema, updateWorkspaceSchema } = require('../validators/workspace.validator');

const router = express.Router();

router.use(protect);

router.get('/', workspaceController.listWorkspaces);
router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.put('/:id', validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);

module.exports = router;
