const mongoose = require('mongoose');

const misconceptionEntrySchema = new mongoose.Schema(
  {
    tag: { type: String, required: true },
    count: { type: Number, default: 1 },
    source: { type: String, enum: ['quiz', 'agent', 'inferred'], default: 'quiz' },
    lastAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const conceptLearningStateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    conceptId: { type: String, required: true, index: true },
    mastery: { type: Number, default: 0, min: 0, max: 100 },
    confidence: { type: Number, default: 0.5, min: 0, max: 1 },
    attemptCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    misconceptions: { type: [misconceptionEntrySchema], default: [] },
    recommendedDifficulty: {
      type: String,
      enum: ['beginner', 'explorer', 'researcher', null],
      default: null,
    },
    lastQuizAt: { type: Date, default: null },
    lastPassedAt: { type: Date, default: null },
    nextBestAction: {
      type: String,
      enum: ['none', 'concept_quiz', 'review_lesson', 'ask_tutor'],
      default: 'none',
    },
    lastEvidenceAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

conceptLearningStateSchema.index({ userId: 1, conceptId: 1 }, { unique: true });

module.exports =
  mongoose.models.ConceptLearningState ||
  mongoose.model('ConceptLearningState', conceptLearningStateSchema);
