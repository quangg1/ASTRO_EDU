import type { CourseEditorPayload } from '@/features/courses/api/coursesApi'

const DRAFT_KEY = (slug: string) => `studio-editor-draft:${slug}`
const BASELINE_KEY = (slug: string) => `studio-editor-baseline:${slug}`

export type StudioEditorDraft = {
  course: CourseEditorPayload
  baseline: string
}

export function loadStudioEditorDraft(slug: string): StudioEditorDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY(slug))
    if (!raw) return null
    const course = JSON.parse(raw) as CourseEditorPayload
    if (!course?.slug || course.slug !== slug || !Array.isArray(course.lessons)) return null
    const baseline = sessionStorage.getItem(BASELINE_KEY(slug)) ?? ''
    return { course, baseline }
  } catch {
    return null
  }
}

export function saveStudioEditorDraft(slug: string, course: CourseEditorPayload, baseline: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(DRAFT_KEY(slug), JSON.stringify(course))
    sessionStorage.setItem(BASELINE_KEY(slug), baseline)
  } catch {
    /* quota */
  }
}

export function clearStudioEditorDraft(slug: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(DRAFT_KEY(slug))
    sessionStorage.removeItem(BASELINE_KEY(slug))
  } catch {
    /* ignore */
  }
}

export function studioDraftIsDirty(draft: StudioEditorDraft): boolean {
  if (!draft.baseline) return true
  return JSON.stringify(draft.course) !== draft.baseline
}
