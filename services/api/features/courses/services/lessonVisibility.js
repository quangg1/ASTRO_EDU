/**
 * Flags for cohort schedule warnings (GV) — course/lesson readiness for learners.
 */

const VISIBILITY_ISSUES = {
  COURSE_DRAFT: 'course_draft',
  EMPTY_LESSON: 'empty_lesson',
  NO_QUIZ_QUESTIONS: 'no_quiz_questions',
};

function collectLessonVisibilityIssues(lesson, coursePublished) {
  const issues = [];
  if (!coursePublished) {
    issues.push(VISIBILITY_ISSUES.COURSE_DRAFT);
  }
  const type = lesson.type || 'text';
  if (type === 'quiz') {
    const n = Array.isArray(lesson.quizQuestions) ? lesson.quizQuestions.length : 0;
    if (n === 0) issues.push(VISIBILITY_ISSUES.NO_QUIZ_QUESTIONS);
  }
  if (type === 'text' || type === 'visualization') {
    const hasContent = Boolean(lesson.content && String(lesson.content).trim());
    const hasSections = Array.isArray(lesson.sections) && lesson.sections.length > 0;
    const hasViz = type === 'visualization' && Boolean(lesson.visualizationId);
    if (!hasContent && !hasSections && !hasViz) {
      issues.push(VISIBILITY_ISSUES.EMPTY_LESSON);
    }
  }
  if (type === 'assignment') {
    const brief = lesson.content || lesson.description || '';
    if (!String(brief).trim()) issues.push(VISIBILITY_ISSUES.EMPTY_LESSON);
  }
  return issues;
}

function hasScheduledOpen(schedule) {
  return Boolean(schedule?.openAt);
}

module.exports = {
  VISIBILITY_ISSUES,
  collectLessonVisibilityIssues,
  hasScheduledOpen,
};
