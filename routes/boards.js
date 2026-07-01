const express = require('express');
const Board = require('../models/Board');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// @route   GET /api/boards
// @desc    Get all boards for logged-in user
router.get('/', async (req, res) => {
  try {
    const boards = await Board.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/boards
// @desc    Create a new board
router.post('/', async (req, res) => {
  try {
    const { title, description, columns } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Board title is required' });
    }

    const board = await Board.create({
      title,
      description,
      columns,
      owner: req.user._id,
    });

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/boards/:id
// @desc    Get a single board with its tasks
router.get('/:id', async (req, res) => {
  try {
    const board = await Board.findOne({ _id: req.params.id, owner: req.user._id });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const tasks = await Task.find({ board: board._id }).sort({ order: 1 });
    res.json({ board, tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/boards/:id
// @desc    Update a board
router.put('/:id', async (req, res) => {
  try {
    const existing = await Board.findOne({ _id: req.params.id, owner: req.user._id });
    if (!existing) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const oldColumns = existing.columns;

    const board = await Board.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // If columns changed, re-map tasks so none end up pointing at a column
    // that no longer exists (renamed or removed).
    if (Array.isArray(req.body.columns)) {
      const newColumns = board.columns;
      const removedOrRenamed = oldColumns.filter((c) => !newColumns.includes(c));

      if (removedOrRenamed.length > 0) {
        // Best-effort: if a column was renamed in place (same position, new
        // text), move its tasks to the new name at that position. Anything
        // that can't be matched by position falls back to the first column.
        await Promise.all(
          oldColumns.map(async (oldName, idx) => {
            if (newColumns.includes(oldName)) return;
            const target = newColumns[idx] || newColumns[0];
            await Task.updateMany({ board: board._id, column: oldName }, { column: target });
          })
        );
      }
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/boards/:id
// @desc    Delete a board and its tasks
router.delete('/:id', async (req, res) => {
  try {
    const board = await Board.findOneAndDelete({ _id: req.params.id, owner: req.user._id });

    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    await Task.deleteMany({ board: board._id });
    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
