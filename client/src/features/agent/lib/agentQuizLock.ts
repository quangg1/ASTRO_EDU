import type { SessionContext } from '../types'

export function isAgentQuizLocked(ctx: SessionContext | null | undefined): boolean {
  if (!ctx) return false
  if (ctx.quizLock === 'recall' || ctx.quizLock === 'course_exam') return true
  if (ctx.recallQuizActive) return true
  return false
}
