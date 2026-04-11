const mongoose = require('mongoose');

const tutorialProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    tutorialSlug: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'in_progress',
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

tutorialProgressSchema.index({ userId: 1, tutorialSlug: 1 }, { unique: true });

module.exports = mongoose.model('TutorialProgress', tutorialProgressSchema);

