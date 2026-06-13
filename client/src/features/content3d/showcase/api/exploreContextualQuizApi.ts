import { getApiPathBase } from '@/lib/apiConfig'
import { apiFetch } from '@/lib/apiRequestInit'
import type { QuizQuestion } from '@/shared/types/quizQuestion'

export type ExploreContextualQuizResponse = {
  entityId: string
  questions: QuizQuestion[]
  poolSize: number
  source: string
  /** Server: user already finished contextual quiz today (VN calendar day). */
  completedToday?: boolean
  calendarDay?: string | null
}

export async function fetchExploreContextualQuiz(
  entityId: string,
): Promise<ExploreContextualQuizResponse | null> {
  const id = String(entityId || '').trim()
  if (!id) return null

  const res = await apiFetch(
    `${getApiPathBase()}/explore/contextual-quiz/${encodeURIComponent(id)}`,
    {},
    false,
  )

  const data = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: ExploreContextualQuizResponse
  } | null

  if (!res.ok || !data?.success || !data.data) return null
  if (data.data.completedToday) return data.data
  if (!data.data.questions?.length) return null
  return data.data
}
