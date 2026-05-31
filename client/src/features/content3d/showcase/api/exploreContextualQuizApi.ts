import { getApiPathBase } from '@/lib/apiConfig'
import { getToken } from '@/features/auth/public'
import type { QuizQuestion } from '@/shared/types/quizQuestion'

export type ExploreContextualQuizResponse = {
  entityId: string
  questions: QuizQuestion[]
  poolSize: number
  source: string
}

export async function fetchExploreContextualQuiz(
  entityId: string,
): Promise<ExploreContextualQuizResponse | null> {
  const id = String(entityId || '').trim()
  if (!id) return null

  const token = getToken()
  const res = await fetch(`${getApiPathBase()}/explore/contextual-quiz/${encodeURIComponent(id)}`, {
    credentials: 'omit',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const data = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: ExploreContextualQuizResponse
  } | null

  if (!res.ok || !data?.success || !data.data?.questions?.length) return null
  return data.data
}
