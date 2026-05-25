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
  FetchCoursesOpts,
  MyCourse,
  CourseEditorPayload,
  UploadMediaContext,
  MediaUploadPurpose,
  QuizQuestion,
} from './api/coursesApi'

/** SSR/RSC fetchers: import from features/courses/server (server-only). */
