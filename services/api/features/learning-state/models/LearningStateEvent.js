const mongoose = require('mongoose');

const learningStateEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'quiz_submitted',
        'lesson_mastered',
        'lesson_dwell',
        'lesson_revisit',
        'explore_entity_focus',
        'depth_preference_set',
        'spaced_review_completed',
        'concept_quiz_submitted',
        'recall_quiz_submitted',
        'explore_quiz_submitted',
        'explore_entity_discovered',
      ],
    },
    surface: { type: String, enum: ['lp', 'explore', 'course', 'agent'], default: 'lp' },
    lessonId: { type: String, default: null, index: true },
    conceptId: { type: String, default: null, index: true },
    entityId: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: String, default: 'api' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

learningStateEventSchema.index({ userId: 1, timestamp: -1 });
learningStateEventSchema.index({ eventId: 1, userId: 1 }, { unique: true });

module.exports =
  mongoose.models.LearningStateEvent ||
  mongoose.model('LearningStateEvent', learningStateEventSchema);
