const mongoose = require('mongoose');

const courseLearningEventSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null, index: true },
    sessionId: { type: String, required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    courseSlug: { type: String, required: true, index: true },
    cohortId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    eventName: {
      type: String,
      required: true,
      enum: [
        'course_lesson_opened',
        'course_lesson_dwell',
        'course_lesson_completed',
        'course_quiz_entered',
        'course_assignment_viewed',
      ],
      index: true,
    },
    lessonSlug: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    durationSec: { type: Number, default: null },
    client: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

courseLearningEventSchema.index({ courseId: 1, cohortId: 1, timestamp: -1 });
courseLearningEventSchema.index({ courseId: 1, lessonSlug: 1, eventName: 1 });

module.exports = mongoose.model('CourseLearningEvent', courseLearningEventSchema);
