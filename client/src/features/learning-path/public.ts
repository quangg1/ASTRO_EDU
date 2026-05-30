/**
 * Cross-domain entry for learning-path (`app/`, shared UI, và domain khác import từ đây).
 * @see DOMAIN_MAP.md
 */
export * from './api/learningPathApi'
export * from './api/server'
export { useLearningPath } from './hooks/useLearningPath'
export * from './lib/learningPathProgress'
export * from './lib/learningPathBehavior'
export * from './lib/lessonRecallQuiz'
