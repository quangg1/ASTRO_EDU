const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function recomputeLessonSignals(lesson) {
  const signals = [];
  let struggleScore = 0;
  if ((lesson.quizFailStreak || 0) >= 2) {
    signals.push('quiz_fail_streak');
    struggleScore += 3;
  }
  if ((lesson.dwellSecTotal7d || 0) >= 480) {
    signals.push('high_dwell');
    struggleScore += 2;
  }
  if ((lesson.revisitCount7d || 0) >= 3) {
    signals.push('frequent_revisit');
    struggleScore += 2;
  }
  if (lesson.mastery >= 80 && lesson.masteredAt) {
    struggleScore = Math.max(0, struggleScore - 1);
  }
  lesson.signals = signals;
  lesson.struggleScore = struggleScore;

  if (signals.includes('quiz_fail_streak')) {
    lesson.nextBestAction = 'ask_tutor';
  } else if (lesson.mastery >= 80 && lesson.masteredAt) {
    lesson.nextBestAction = 'spaced_review';
  } else if (lesson.mastery < 60) {
    lesson.nextBestAction = 'recall_quiz';
  } else {
    lesson.nextBestAction = 'review_lesson';
  }
}

function applyRecallQuizToLesson(lesson, { passed, score }) {
  lesson.attemptCount = (lesson.attemptCount || 0) + 1;
  lesson.lastQuizAt = new Date();
  if (passed) {
    lesson.successCount = (lesson.successCount || 0) + 1;
    lesson.quizFailStreak = 0;
    lesson.mastery = 100;
    lesson.confidence = clamp((lesson.confidence || 0.5) + 0.15, 0, 1);
    lesson.lastPassedAt = new Date();
    lesson.masteredAt = lesson.masteredAt || new Date();
    lesson.spacedReview = lesson.spacedReview || {};
    lesson.spacedReview.masteredAt = lesson.spacedReview.masteredAt || new Date();
  } else {
    lesson.quizFailStreak = (lesson.quizFailStreak || 0) + 1;
    const drop = Math.max(5, Math.round((100 - (score || 0)) / 10));
    lesson.mastery = clamp((lesson.mastery || 0) - drop, 0, 100);
    lesson.confidence = clamp((lesson.confidence || 0.5) - 0.08, 0, 1);
  }
  lesson.lastEvidenceAt = new Date();
  recomputeLessonSignals(lesson);
}

/** Khám phá 3D — tăng nhẹ engagement, không coi là mastery LP. */
function applyExploreFocusToConcept(concept, { dwellSec = 0 } = {}) {
  const sec = Number(dwellSec) || 0;
  if (sec < 3) return;
  concept.mastery = clamp((concept.mastery || 0) + 3, 0, 75);
  concept.confidence = clamp((concept.confidence || 0.5) + 0.04, 0, 1);
  concept.lastEvidenceAt = new Date();
  if ((concept.mastery || 0) < 50) {
    concept.nextBestAction = 'concept_quiz';
  }
}

function applyConceptQuizToConcept(concept, { passed, score, misconceptionTag }) {
  concept.attemptCount = (concept.attemptCount || 0) + 1;
  concept.lastQuizAt = new Date();
  if (passed) {
    concept.successCount = (concept.successCount || 0) + 1;
    concept.mastery = clamp(Math.max(concept.mastery || 0, score || 60), 0, 100);
    concept.confidence = clamp((concept.confidence || 0.5) + 0.12, 0, 1);
    concept.lastPassedAt = new Date();
    concept.nextBestAction = concept.mastery >= 85 ? 'none' : 'review_lesson';
  } else {
    const drop = Math.max(8, Math.round((100 - (score || 0)) / 8));
    concept.mastery = clamp((concept.mastery || 0) - drop, 0, 100);
    concept.confidence = clamp((concept.confidence || 0.5) - 0.1, 0, 1);
    concept.nextBestAction = 'concept_quiz';
    if (misconceptionTag) {
      const tag = String(misconceptionTag).trim().slice(0, 120);
      if (tag) {
        const list = concept.misconceptions || [];
        const hit = list.find((m) => m.tag === tag);
        if (hit) {
          hit.count = (hit.count || 0) + 1;
          hit.lastAt = new Date();
        } else {
          list.push({ tag, count: 1, source: 'quiz', lastAt: new Date() });
        }
        concept.misconceptions = list.slice(-8);
      }
    }
  }
  if (concept.mastery < 50) concept.recommendedDifficulty = 'beginner';
  else if (concept.mastery < 75) concept.recommendedDifficulty = 'explorer';
  else concept.recommendedDifficulty = 'researcher';
  concept.lastEvidenceAt = new Date();
}

function applyDwellToLesson(lesson, dwellSec) {
  lesson.dwellSecTotal7d = (lesson.dwellSecTotal7d || 0) + dwellSec;
  lesson.lastEvidenceAt = new Date();
  recomputeLessonSignals(lesson);
}

function applyRevisitToLesson(lesson) {
  lesson.revisitCount7d = (lesson.revisitCount7d || 0) + 1;
  lesson.lastEvidenceAt = new Date();
  recomputeLessonSignals(lesson);
}

function daysSince(date) {
  if (!date) return Infinity;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / (24 * 60 * 60 * 1000);
}

function isSpacedReviewDue(lesson) {
  if (!lesson.masteredAt && !lesson.spacedReview?.masteredAt) return false;
  const entry = lesson.spacedReview || {};
  const reviewCount = Number(entry.reviewCount) || 0;
  const intervalIdx = Math.min(reviewCount, REVIEW_INTERVALS_DAYS.length - 1);
  const requiredDays = REVIEW_INTERVALS_DAYS[intervalIdx];
  const elapsed = daysSince(entry.lastReviewAt || entry.masteredAt || lesson.masteredAt);
  return elapsed >= requiredDays;
}

function spacedReviewPriority(lesson) {
  const entry = lesson.spacedReview || {};
  const reviewCount = Number(entry.reviewCount) || 0;
  const intervalIdx = Math.min(reviewCount, REVIEW_INTERVALS_DAYS.length - 1);
  const requiredDays = REVIEW_INTERVALS_DAYS[intervalIdx];
  const elapsed = daysSince(entry.lastReviewAt || entry.masteredAt || lesson.masteredAt);
  return elapsed / Math.max(1, requiredDays);
}

/** Explore contextual quiz — pass hết = mạnh; một phần đúng = cập nhật vừa. */
function applyExploreQuizToLesson(lesson, { allCorrect, score }) {
  lesson.attemptCount = (lesson.attemptCount || 0) + 1;
  lesson.lastQuizAt = new Date();
  if (allCorrect) {
    lesson.quizFailStreak = 0;
    lesson.mastery = Math.max(lesson.mastery || 0, 55);
    lesson.confidence = clamp((lesson.confidence || 0.5) + 0.1, 0, 1);
    lesson.nextBestAction = 'review_lesson';
  } else {
    lesson.mastery = Math.max(lesson.mastery || 0, Math.min(40, score || 0));
    lesson.confidence = clamp((lesson.confidence || 0.5) - 0.03, 0, 1);
    lesson.nextBestAction = 'recall_quiz';
  }
  lesson.lastEvidenceAt = new Date();
  recomputeLessonSignals(lesson);
}

module.exports = {
  REVIEW_INTERVALS_DAYS,
  applyRecallQuizToLesson,
  applyConceptQuizToConcept,
  applyExploreFocusToConcept,
  applyExploreQuizToLesson,
  applyDwellToLesson,
  applyRevisitToLesson,
  recomputeLessonSignals,
  isSpacedReviewDue,
  spacedReviewPriority,
  clamp,
};
