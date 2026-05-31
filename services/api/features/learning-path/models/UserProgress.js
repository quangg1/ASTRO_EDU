const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    learningPathCompletedLessonIds: { type: [String], default: [] },
    learningPathMasteredLessonIds: { type: [String], default: [] },
    learningPathVisited3DLessonIds: { type: [String], default: [] },
    learningPathLastLessonId: { type: String, default: '' },
    solarJourneyCompletedMilestoneIds: { type: [String], default: [] },
    /** entityId → recent contextual quiz question ids (rotation) */
    exploreQuizRecentByEntity: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.models.UserProgress || mongoose.model('UserProgress', userProgressSchema);
