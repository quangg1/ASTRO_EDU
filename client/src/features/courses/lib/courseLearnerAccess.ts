import type { Course } from '@/features/courses/api/coursesApi'

/** Học viên đã ghi danh, hoặc GV/admin đang soạn / sở hữu khóa. */
export function hasCourseLearnerAccess(course: Course | null | undefined): boolean {
  if (!course) return false
  if (course.enrollment != null) return true
  if (course.staffAccess) return true
  return course.deliveryContext?.mode === 'editor'
}
