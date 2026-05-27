const mongoose = require('mongoose');

const misconceptionSchema = new mongoose.Schema(
  {
    conceptId: { type: String, default: '' },
    lessonId: { type: String, default: '' },
    tag: { type: String, required: true },
    source: { type: String, enum: ['quiz_clarify', 'agent_inferred'], default: 'quiz_clarify' },
    count: { type: Number, default: 1 },
    lastAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const coachStateSchema = new mongoose.Schema(
  {
    sessionCoachCount: { type: Number, default: 0 },
    lastCoachAt: { type: Date, default: null },
    dismissUntil: { type: Date, default: null },
    lastDismissAt: { type: Date, default: null },
    lastLessonId: { type: String, default: null },
    quizFailStreakByLesson: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const spacedReviewSchema = new mongoose.Schema(
  {
    lastReviewByLesson: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const depthPrefsSchema = new mongoose.Schema(
  {
    preferredDepth: {
      type: String,
      enum: ['beginner', 'explorer', 'researcher'],
      default: null,
    },
    updatedAt: { type: Date, default: null },
  },
  { _id: false },
);

const learnerAgentProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    misconceptions: { type: [misconceptionSchema], default: [] },
    coach: { type: coachStateSchema, default: () => ({}) },
    spacedReview: { type: spacedReviewSchema, default: () => ({}) },
    depthPrefs: { type: depthPrefsSchema, default: () => ({}) },
    coachCopyVariant: { type: String, enum: ['a', 'b'], default: 'a' },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.LearnerAgentProfile ||
  mongoose.model('LearnerAgentProfile', learnerAgentProfileSchema);
