/**
 * Cross-domain entry for learning-path (`app/`, shared UI, và domain khác import từ đây).
 * RSC merge helpers: `@/features/learning-path/server` (không re-export ở đây).
 * @see DOMAIN_MAP.md
 */
export * from './api/learningPathApi'
export { useLearningPath } from './hooks/useLearningPath'
export { useLearnerNextAction } from './hooks/useLearnerNextAction'
export * from './lib/learningPathProgress'
export * from './lib/learningPathBehavior'
export * from './lib/lessonRecallQuiz'
export * from './lib/studioJourneyValidator'
export * from './lib/learningJourneyGuardrails'
export * from './lib/resolveLearnerNextAction'
export * from './data/learningPathCurriculum'

export { StudioLearningPathPage } from './ui/studio/StudioLearningPathPage'
export { LearningLessonView } from './ui/lesson/LearningLessonView'
export type { LearningLessonViewProps } from './ui/lesson/LearningLessonView'
export { LessonRecallQuizOverlay } from './ui/LessonRecallQuizOverlay'
export { TopicExploreView } from './ui/TopicExploreView'
export { default as LearningPathHub } from './ui/LearningPathHub'
export { TutorialJourneyGuide } from './ui/TutorialJourneyGuide'
export { default as LearningModuleView } from './ui/LearningModuleView'
export { default as LearningNodeView } from './ui/LearningNodeView'
