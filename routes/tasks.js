const express = require('express');
const Task = require('../models/Task');
const Board = require('../models/Board');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Helper: verify the board belongs to the logged-in user
const verifyBoardOwnership = async (boardId, userId) => {
  const board = await Board.findOne({ _id: boardId, owner: userId });
  return board;
};

// @route   POST /api/tasks
// @desc    Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, board, column, priority, dueDate } = req.body;

    if (!title || !board) {
      return res.status(400).json({ message: 'Title and board are required' });
    }

    const boardDoc = await verifyBoardOwnership(board, req.user._id);
    if (!boardDoc) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const taskCount = await Task.countDocuments({ board, column: column || boardDoc.columns[0] });

    const task = await Task.create({
      title,
      description,
      board,
      column: column || boardDoc.columns[0],
      priority,
      dueDate,
      order: taskCount,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task (including moving between columns)
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('board');

    if (!task || String(task.board.owner) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Task not found' });
    }

    Object.assign(task, req.body);
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/tasks/reorder
// @desc    Bulk update task order/column after drag-and-drop
router.put('/reorder/bulk', async (req, res) => {
  try {
    const { tasks } = req.body; // [{ _id, column, order }, ...]

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ message: 'tasks must be an array' });
    }

    const bulkOps = tasks.map((t) => ({
      updateOne: {
        filter: { _id: t._id },
        update: { column: t.column, order: t.order },
      },
    }));

    await Task.bulkWrite(bulkOps);
    res.json({ message: 'Tasks reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('board');

    if (!task || String(task.board.owner) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
