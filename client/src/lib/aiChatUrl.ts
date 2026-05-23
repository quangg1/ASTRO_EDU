import ENV from '@galaxies/shared/envNames'
import { readEnv } from '@/lib/readEnv'

function trimSlash(s: string): string {
  return s.replace(/\/$/, '')
}

/** Static site: gọi thẳng AI service. Dev/Node: proxy `/api/chat`. */
export function getAiChatUrl(): string {
  const direct = readEnv(ENV.NEXT_PUBLIC_AI_SERVICE_URL)
  if (direct) return `${trimSlash(direct)}/chat`
  return '/api/chat'
}
