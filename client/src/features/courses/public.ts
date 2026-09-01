/**
 * Public surface for course delivery (pages, tutor, SSR fetchers).
 *
 * `app/` and cross-domain code should import from here, not `./api/*`.
 *
 * @see DOMAIN_MAP.md §3
 */
export { useTutorContextStore } from './stores/useTutorContextStore'
export type { TutorCourseContext } from './stores/useTutorContextStore'

export {
  fetchCourses,
  fetchCourse,
  fetchCourseOutline,
  fetchCoursesForEditor,
  fetchTeachersForCourseEditor,
  fetchCourseForEditor,
  saveCourseFromEditor,
  createCourse,
  fetchMyCourses,
  enrollCourse,
  updateLessonProgress,
  uploadMedia,
} from './api/coursesApi'
export type {
  Course,
  Lesson,
  CourseModule,
  CourseLessonOutline,
  LessonSection,
  SectionType,
  ResourceLink,
  FetchCoursesOpts,
  MyCourse,
  CourseEditorPayload,
  CourseEditorTeacherOption,
  UploadMediaContext,
  MediaUploadPurpose,
  QuizQuestion,
  QuizSettings,
  ModuleMaterial,
} from './api/coursesApi'

export {
  buildLessonSectionTocNavItems,
  groupLessonSectionTocItems,
  resolveLessonSectionTocTitle,
} from './lib/lessonSectionToc'
export type { LessonSectionTocGroup, LessonSectionTocNavItem } from './lib/lessonSectionToc'

export { ExamRunner } from './exam/ExamRunner'
export { CohortHub } from './cohort/CohortHub'
export { CohortStudioManager } from './cohort/CohortStudioManager'
export { CourseCohortsJoin } from './cohort/CourseCohortsJoin'
export { LessonTypeIcon, lessonTypeIconKey } from './cohort/LessonTypeIcon'
export {
  catalogPricingVisibleForStrategy,
  cohortsNavEnabledForStrategy,
  distributionStrategyBadge,
  resolveDistributionStrategy,
  type DistributionStrategy,
} from './lib/distributionStrategy'
export {
  loadStudioEditorDraft,
  saveStudioEditorDraft,
  studioDraftIsDirty,
  type StudioEditorDraft,
} from './lib/studioEditorDraft'
export { fetchCohortSyllabus, fetchCohortHome } from './api/cohortApi'
export { AssignmentSubmit } from './assignments/AssignmentSubmit'

export { MyCoursesPage } from './ui/my-courses/MyCoursesPage'
export {
  courseLevelLabel,
  courseRequiresPayment,
  formatCatalogPrice,
} from './ui/courseCatalogMeta'
export { CourseCatalogCard } from './ui/CourseCatalogCard'
export { VideoWithTranscriptPanel } from './ui/VideoWithTranscriptPanel'
export { CoursePromoBanner } from './ui/CoursePromoBanner'
export { CourseInstructorCard } from './ui/CourseInstructorCard'
export { CourseLandingClient } from './ui/CourseLandingClient'
export { CoursePageClient } from './ui/CoursePageClient'

/** SSR/RSC fetchers: import from features/courses/server (server-only). */
