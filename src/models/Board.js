const mongoose = require('mongoose');
const { DEFAULT_COLUMNS } = require('../constants/enums');

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Board title is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    columns: {
      type: [String],
      default: () => [...DEFAULT_COLUMNS],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'A board needs at least one column',
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

boardSchema.index({ owner: 1, isArchived: 1, createdAt: -1 });

boardSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'board',
  count: true,
});

boardSchema.set('toJSON', { virtuals: true });
boardSchema.set('toObject', { virtuals: true });

boardSchema.pre(/^find/, function excludeDeleted(next) {
  const filter = this.getFilter();
  if (filter.includeDeleted) {
    delete filter.includeDeleted;
  } else if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model('Board', boardSchema);
