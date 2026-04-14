/**
 * Parse [ACTION:type:param] từ nội dung trả lời của AI (chế độ course).
 * Trả về { text: nội dung đã bỏ dòng action, actions: [...] }
 */
const ACTION_REG = /\[ACTION:(\w+):([^\]\s]+)\]/g

export type TutorAction =
  | { type: 'open_lesson'; lessonSlug: string }
  | { type: 'go_to_explore'; stageTime: number }
  | { type: 'open_courses' }
  | { type: 'open_dashboard' }
  | { type: 'open_my_courses' }

/** Phản hồi từ Python service (đã validate). */
export type ApiToolCall = {
  id?: string
  name: string
  arguments: Record<string, unknown>
}

function actionKey(a: TutorAction): string {
  if (a.type === 'open_lesson') return `lesson:${a.lessonSlug}`
  if (a.type === 'go_to_explore') return `explore:${a.stageTime}`
  return a.type
}

/** Chuyển tool_calls từ API → TutorAction (chỉ các tool được server cho phép). */
export function toolCallsToTutorActions(calls: unknown): TutorAction[] {
  if (!Array.isArray(calls)) return []
  const out: TutorAction[] = []
  for (const c of calls) {
    if (!c || typeof c !== 'object') continue
    const name = (c as ApiToolCall).name
    const args = (c as ApiToolCall).arguments
    if (typeof name !== 'string' || !args || typeof args !== 'object') continue
    if (name === 'open_lesson') {
      const slug = args.lesson_slug
      if (typeof slug === 'string' && slug.trim()) out.push({ type: 'open_lesson', lessonSlug: slug.trim() })
    } else if (name === 'go_to_explore') {
      const ma = args.stage_time_ma
      const n = typeof ma === 'number' ? ma : Number(ma)
      if (!Number.isNaN(n)) out.push({ type: 'go_to_explore', stageTime: n })
    } else if (name === 'open_courses') {
      out.push({ type: 'open_courses' })
    } else if (name === 'open_dashboard') {
      out.push({ type: 'open_dashboard' })
    } else if (name === 'open_my_courses') {
      out.push({ type: 'open_my_courses' })
    }
  }
  return out
}

/** Gộp actions từ tool + từ text, bỏ trùng. */
export function mergeTutorActions(fromTools: TutorAction[], fromText: TutorAction[]): TutorAction[] {
  const seen = new Set<string>()
  const merged: TutorAction[] = []
  for (const a of [...fromTools, ...fromText]) {
    const k = actionKey(a)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(a)
  }
  return merged
}

export function parseTutorActions(content: string): { text: string; actions: TutorAction[] } {
  const actions: TutorAction[] = []
  let match: RegExpExecArray | null
  const reg = new RegExp(ACTION_REG.source, 'g')
  while ((match = reg.exec(content)) !== null) {
    const [, type, param] = match
    if (type === 'open_lesson' && param) {
      actions.push({ type: 'open_lesson', lessonSlug: param.trim() })
    } else if (type === 'go_to_explore' && param) {
      const time = parseFloat(param)
      if (!Number.isNaN(time)) actions.push({ type: 'go_to_explore', stageTime: time })
    }
  }
  const text = content.replace(ACTION_REG, '').replace(/\n\s*\n\s*\n/g, '\n\n').trim()
  return { text, actions }
}
