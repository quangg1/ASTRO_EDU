const mongoose = require('mongoose');

const learnerSignalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    signalType: {
      type: String,
      required: true,
      enum: ['dwell_struggle', 'frequent_revisit', 'quiz_fail_streak', 'explore_focus_engaged'],
      index: true,
    },
    lessonId: { type: String, default: null, index: true },
    entityId: { type: String, default: null, index: true },
    score: { type: Number, default: 1 },
    sourceEventId: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastSeenAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, minimize: false },
);

learnerSignalSchema.index({ userId: 1, signalType: 1, lessonId: 1 }, { unique: true, sparse: true });
learnerSignalSchema.index({ userId: 1, signalType: 1, entityId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.LearnerSignal || mongoose.model('LearnerSignal', learnerSignalSchema);
