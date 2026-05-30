import type { LessonVisibilityIssue } from '@/features/courses/api/cohortApi'

export function visibilityIssueLabel(issue: LessonVisibilityIssue | string): string {
  switch (issue) {
    case 'course_draft':
      return 'Khóa học đang ở bản nháp — học viên không thấy nội dung dù đến giờ mở bài'
    case 'empty_lesson':
      return 'Bài chưa có nội dung trong Studio'
    case 'no_quiz_questions':
      return 'Bài quiz chưa có câu hỏi'
    default:
      return 'Bài có thể chưa hiển thị với học viên'
  }
}

export function visibilityIssueShort(issue: LessonVisibilityIssue | string): string {
  switch (issue) {
    case 'course_draft':
      return 'Khóa nháp'
    case 'empty_lesson':
      return 'Chưa có nội dung'
    case 'no_quiz_questions':
      return 'Quiz trống'
    default:
      return 'Cảnh báo'
  }
}
