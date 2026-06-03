const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  applyRecallQuizToLesson,
  applyConceptQuizToConcept,
  applyExploreFocusToConcept,
  applyExploreQuizToLesson,
  isSpacedReviewDue,
} = require('../features/learning-state/services/learningStateScoring');

test('recall pass sets mastery 100', () => {
  const lesson = { mastery: 20, confidence: 0.5, quizFailStreak: 2 };
  applyRecallQuizToLesson(lesson, { passed: true, score: 100 });
  assert.equal(lesson.mastery, 100);
  assert.equal(lesson.quizFailStreak, 0);
});

test('recall fail increases streak and lowers mastery', () => {
  const lesson = { mastery: 50, confidence: 0.5, quizFailStreak: 0 };
  applyRecallQuizToLesson(lesson, { passed: false, score: 40 });
  assert.equal(lesson.quizFailStreak, 1);
  assert.ok(lesson.mastery < 50);
});

test('concept quiz fail records misconception', () => {
  const concept = { mastery: 30, misconceptions: [] };
  applyConceptQuizToConcept(concept, {
    passed: false,
    score: 30,
    misconceptionTag: 'axis_confusion',
  });
  assert.equal(concept.misconceptions.length, 1);
  assert.equal(concept.misconceptions[0].tag, 'axis_confusion');
});

test('explore focus bumps concept lightly without full mastery', () => {
  const concept = { mastery: 10, confidence: 0.5, misconceptions: [] };
  applyExploreFocusToConcept(concept, { dwellSec: 5 });
  assert.ok(concept.mastery > 10 && concept.mastery <= 75);
});

test('explore quiz pass does not set lesson mastery to 100', () => {
  const lesson = { mastery: 0, confidence: 0.5, quizFailStreak: 0 };
  applyExploreQuizToLesson(lesson, { allCorrect: true, score: 100 });
  assert.equal(lesson.mastery, 55);
});

test('spaced review due after mastered without review', () => {
  const lesson = {
    masteredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    spacedReview: { masteredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), reviewCount: 0 },
  };
  assert.equal(isSpacedReviewDue(lesson), true);
});
