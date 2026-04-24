const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    learningPathCompletedLessonIds: { type: [String], default: [] },
    /** Bài đã vượt kiểm tra nhanh (mastery), tách khỏi chỉ đánh dấu đã đọc. */
    learningPathMasteredLessonIds: { type: [String], default: [] },
    learningPathLastLessonId: { type: String, default: '' },
    solarJourneyCompletedMilestoneIds: { type: [String], default: [] },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model('UserProgress', userProgressSchema);
