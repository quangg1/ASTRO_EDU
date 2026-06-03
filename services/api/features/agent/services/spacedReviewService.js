const {
  getSpacedReviewDue,
  recordSpacedReview,
  recordLearningEvent,
} = require('../../learning-state/services/learningStateEngine');

async function markLessonMasteredForSpaced(userId, lessonId) {
  if (!userId || !lessonId) return;
  await recordLearningEvent(userId, {
    type: 'lesson_mastered',
    lessonId: String(lessonId).trim(),
    source: 'spaced_mark',
  });
}

module.exports = {
  getSpacedReviewDue,
  recordSpacedReview,
  markLessonMasteredForSpaced,
};
