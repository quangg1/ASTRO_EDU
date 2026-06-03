const mongoose = require('mongoose');

const lessonLearningStateSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    lessonId: { type: String, required: true, index: true },
    mastery: { type: Number, default: 0, min: 0, max: 100 },
    confidence: { type: Number, default: 0.5, min: 0, max: 1 },
    quizFailStreak: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    struggleScore: { type: Number, default: 0 },
    signals: { type: [String], default: [] },
    lastQuizAt: { type: Date, default: null },
    lastPassedAt: { type: Date, default: null },
    masteredAt: { type: Date, default: null },
    dwellSecTotal7d: { type: Number, default: 0 },
    revisitCount7d: { type: Number, default: 0 },
    spacedReview: {
      masteredAt: { type: Date, default: null },
      lastReviewAt: { type: Date, default: null },
      reviewCount: { type: Number, default: 0 },
    },
    nextBestAction: {
      type: String,
      enum: ['none', 'recall_quiz', 'review_lesson', 'easier_depth', 'spaced_review', 'ask_tutor'],
      default: 'none',
    },
    lastEvidenceAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

lessonLearningStateSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonLearningStateSchema.index({ userId: 1, struggleScore: -1 });

module.exports =
  mongoose.models.LessonLearningState ||
  mongoose.model('LessonLearningState', lessonLearningStateSchema);
