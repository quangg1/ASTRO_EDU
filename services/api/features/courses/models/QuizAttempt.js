const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonSlug: { type: String, required: true },
  cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', default: null, index: true },
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  lockedQuestionIds: [{ type: String }],
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'timed_out'],
    default: 'in_progress',
    index: true,
  },
  revision: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  lastSavedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  score: { type: Number, default: null },
  correctCount: { type: Number, default: null },
  questionCount: { type: Number, default: null },
}, { timestamps: true });

quizAttemptSchema.index(
  { userId: 1, courseId: 1, lessonSlug: 1, cohortId: 1, status: 1 },
  { name: 'quiz_attempt_lookup' },
);

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
