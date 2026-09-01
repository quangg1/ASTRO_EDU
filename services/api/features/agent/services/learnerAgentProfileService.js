/**
 * Thin public API over LearnerAgentProfile for learning-state / context builders.
 */
const LearnerAgentProfile = require('../models/LearnerAgentProfile');

function getProfile(userId, { projection } = {}) {
  if (!userId) return Promise.resolve(null);
  return LearnerAgentProfile.findOne({ userId }, projection).lean();
}

function setPreferredDepth(userId, depth) {
  return LearnerAgentProfile.findOneAndUpdate(
    { userId },
    { $set: { 'depthPrefs.preferredDepth': depth, 'depthPrefs.updatedAt': new Date() } },
    { upsert: true, new: true },
  ).lean();
}

function markLearningStateMigrated(userId) {
  return LearnerAgentProfile.findOneAndUpdate(
    { userId },
    { $set: { learningStateMigratedAt: new Date() } },
    { upsert: true },
  );
}

/** Aggregate quiz-fail maps for admin struggle heatmap. */
function listProfilesWithQuizFailMap() {
  return LearnerAgentProfile.aggregate([
    { $project: { userId: 1, quizMap: '$coach.quizFailStreakByLesson' } },
    { $match: { quizMap: { $exists: true, $ne: {} } } },
  ]);
}

function countProfiles() {
  return LearnerAgentProfile.countDocuments({});
}

module.exports = {
  getProfile,
  setPreferredDepth,
  markLearningStateMigrated,
  listProfilesWithQuizFailMap,
  countProfiles,
};
