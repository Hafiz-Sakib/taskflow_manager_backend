const express = require('express');
const boardController = require('../controllers/board.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBoardSchema, updateBoardSchema } = require('../validators/board.validator');

const router = express.Router();

router.use(protect);

router.get('/', boardController.listBoards);
router.post('/', validate(createBoardSchema), boardController.createBoard);
router.get('/:id', boardController.getBoard);
router.put('/:id', validate(updateBoardSchema), boardController.updateBoard);
router.patch('/:id/archive', boardController.archiveBoard);
router.delete('/:id', boardController.deleteBoard);
router.get('/:id/activity', boardController.getActivity);

module.exports = router;
