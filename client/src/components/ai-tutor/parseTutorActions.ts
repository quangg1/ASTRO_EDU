/**
 * Parse [ACTION:type:param] từ nội dung trả lời của AI (chế độ course).
 * Trả về { text: nội dung đã bỏ dòng action, actions: [...] }
 */
const ACTION_REG = /\[ACTION:(\w+):([^\]\s]+)\]/g

export type TutorAction =
  | { type: 'open_lesson'; lessonSlug: string }
  | { type: 'go_to_explore'; stageTime: number }

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
