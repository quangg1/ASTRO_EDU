import type { LessonItem } from '@/features/learning-path/data/learningPathCurriculum'

export function escapeHtmlTitle(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function placeholderBody(lesson: LessonItem) {
  return `<p class="text-ds-muted leading-relaxed">Nội dung bài học đang được biên soạn. Tiêu đề: <strong>${escapeHtmlTitle(lesson.titleVi)}</strong></p><p class="text-ds-subtle text-sm mt-4">Giáo viên có thể thêm nội dung trong Studio → Lộ trình học.</p>`
}
