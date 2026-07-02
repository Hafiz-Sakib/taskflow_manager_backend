const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: 100,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

workspaceSchema.virtual('boards', {
  ref: 'Board',
  localField: '_id',
  foreignField: 'workspace',
});

workspaceSchema.set('toJSON', { virtuals: true });
workspaceSchema.set('toObject', { virtuals: true });

workspaceSchema.pre(/^find/, function excludeDeleted(next) {
  const filter = this.getFilter();
  if (filter.includeDeleted) {
    delete filter.includeDeleted;
  } else if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model('Workspace', workspaceSchema);
