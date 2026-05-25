import { getApiPathBase } from '@/lib/apiConfig'
import type { LearnerTierProgress } from './learnerTiersApi'

const API = `${getApiPathBase()}/gems`

export interface GemWalletState {
  balance: number
  level?: number
  totalGemsEarned?: number
  learnerTier?: LearnerTierProgress
  transactions: GemTransaction[]
}

export interface GemTransaction {
  id: string
  amount: number
  reason: string
  type: string
  createdAt: string
  meta?: { lessonId?: string; [key: string]: unknown }
}

/** GET /gems/wallet — server source of truth when authenticated. */
export async function fetchGemWalletFromServer(token: string): Promise<GemWalletState | null> {
  try {
    const res = await fetch(`${API}/wallet`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!data?.success || !data?.data) return null
    return {
      balance: Number(data.data.balance) || 0,
      level: typeof data.data.level === 'number' ? data.data.level : undefined,
      totalGemsEarned:
        typeof data.data.totalGemsEarned === 'number' ? data.data.totalGemsEarned : undefined,
      learnerTier: data.data.learnerTier ?? undefined,
      transactions: Array.isArray(data.data.transactions) ? data.data.transactions : [],
    }
  } catch {
    return null
  }
}
