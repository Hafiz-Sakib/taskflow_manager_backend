const mongoose = require('mongoose');
const { PRIORITIES } = require('../constants/enums');

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true, _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true, _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    column: {
      type: String,
      required: true,
      default: 'To Do',
      index: true,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'medium',
      index: true,
    },
    labels: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    checklist: {
      type: [checklistItemSchema],
      default: [],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

taskSchema.index({ board: 1, column: 1, order: 1 });
taskSchema.index({ title: 'text', description: 'text' });

taskSchema.pre(/^find/, function excludeDeleted(next) {
  const filter = this.getFilter();
  if (filter.includeDeleted) {
    delete filter.includeDeleted;
  } else if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
