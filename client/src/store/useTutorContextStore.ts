import { create } from 'zustand'
import type { Lesson } from '@/lib/coursesApi'

export interface TutorCourseContext {
  courseSlug: string
  courseTitle: string
  lessons: Array<{ slug: string; title: string; type: string; stageTime?: number | null }>
  currentLessonSlug?: string | null
}

interface TutorContextState {
  /** 'course' khi đang ở trang khóa học; 'general' ở các trang khác. */
  mode: 'general' | 'course'
  course: TutorCourseContext | null
  setCourseContext: (ctx: TutorCourseContext | null) => void
  /** Trong course: true = yêu cầu mở panel Agent (tự hiển thị). AITutor đọc rồi set lại false. */
  requestAgentOpen: boolean
  setRequestAgentOpen: (v: boolean) => void
}

export const useTutorContextStore = create<TutorContextState>((set) => ({
  mode: 'general',
  course: null,
  requestAgentOpen: false,
  setCourseContext: (ctx) =>
    set({
      mode: ctx ? 'course' : 'general',
      course: ctx,
    }),
  setRequestAgentOpen: (v) => set({ requestAgentOpen: v }),
}))
