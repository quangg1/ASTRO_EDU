import { getApiPathBase } from '@/lib/apiConfig'

const PREFIX = 'cosmo-gem-wallet-v1'
const API = `${getApiPathBase()}/gems`

export type GemTransactionType =
  | 'lesson_complete'
  | 'daily_streak'
  | 'community_reply'
  | 'purchase'
  | 'manual_adjustment'

export interface GemTransaction {
  id: string
  amount: number
  reason: string
  type: GemTransactionType
  createdAt: string
  /** Dùng để idempotent (ví dụ lessonId đã thưởng) */
  meta?: { lessonId?: string; [key: string]: unknown }
}

/** Thưởng khi đánh dấu hoàn thành 1 bài trong Learning Path (client, local-first). */
export const GEM_REWARD_LEARNING_PATH_LESSON = 5

export interface GemWalletState {
  balance: number
  transactions: GemTransaction[]
}

function walletKey(userId?: string | null): string {
  const id = userId != null && String(userId).trim() ? String(userId).trim() : 'guest'
  return `${PREFIX}:user:${id}`
}

function createStarterWallet(): GemWalletState {
  const now = Date.now()
  return {
    balance: 10,
    transactions: [
      {
        id: `tx-${now - 2 * 60 * 60 * 1000}`,
        amount: 5,
        reason: 'Earned for completing a lesson',
        type: 'lesson_complete',
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `tx-${now - 24 * 60 * 60 * 1000}`,
        amount: 5,
        reason: 'Earned for completing a lesson',
        type: 'lesson_complete',
        createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  }
}

export function loadGemWallet(userId?: string | null): GemWalletState {
  if (typeof window === 'undefined') return createStarterWallet()
  try {
    const raw = localStorage.getItem(walletKey(userId))
    if (!raw) {
      const starter = createStarterWallet()
      localStorage.setItem(walletKey(userId), JSON.stringify(starter))
      return starter
    }
    const parsed = JSON.parse(raw) as Partial<GemWalletState>
    const tx = Array.isArray(parsed?.transactions) ? parsed.transactions : []
    const balance = typeof parsed?.balance === 'number' ? parsed.balance : 0
    return {
      balance,
      transactions: tx
        .filter((item): item is GemTransaction => !!item && typeof item.id === 'string')
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    }
  } catch {
    return createStarterWallet()
  }
}

export function saveGemWallet(state: GemWalletState, userId?: string | null) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(walletKey(userId), JSON.stringify(state))
  } catch {
    /* ignore quota errors */
  }
}

export function addGemTransaction(
  payload: Omit<GemTransaction, 'id' | 'createdAt'>,
  userId?: string | null,
): GemWalletState {
  const current = loadGemWallet(userId)
  const nextTx: GemTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...payload,
  }
  const next: GemWalletState = {
    balance: Math.max(0, current.balance + nextTx.amount),
    transactions: [nextTx, ...current.transactions],
  }
  saveGemWallet(next, userId)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gem-wallet-changed'))
  }
  return next
}

function hasLessonGemReward(wallet: GemWalletState, lessonId: string): boolean {
  const id = String(lessonId || '').trim()
  if (!id) return true
  return wallet.transactions.some(
    (t) => t.type === 'lesson_complete' && String(t.meta?.lessonId || '').trim() === id,
  )
}

/**
 * Cộng Gem khi hoàn thành bài học lộ trình — tối đa một lần / lessonId.
 * Trả về `null` nếu đã thưởng trước đó hoặc lessonId rỗng.
 */
export function awardGemsForLearningPathLesson(
  lessonId: string,
  userId?: string | null,
  amount: number = GEM_REWARD_LEARNING_PATH_LESSON,
): GemWalletState | null {
  const lid = String(lessonId || '').trim()
  if (!lid) return null
  const current = loadGemWallet(userId)
  if (hasLessonGemReward(current, lid)) return null
  return addGemTransaction(
    {
      amount,
      reason: 'Hoàn thành bài học trong lộ trình',
      type: 'lesson_complete',
      meta: { lessonId: lid },
    },
    userId,
  )
}

/**
 * Placeholder for future backend sync.
 * Keep local-first behavior now; enable server source of truth later.
 */
export async function syncGemWallet(userId?: string | null): Promise<GemWalletState> {
  const local = loadGemWallet(userId)
  const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
  if (!token || !userId) return local
  try {
    const res = await fetch(`${API}/wallet`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!data?.success || !data?.data) return local
    const serverState: GemWalletState = {
      balance: Number(data.data.balance) || 0,
      transactions: Array.isArray(data.data.transactions) ? data.data.transactions : [],
    }
    saveGemWallet(serverState, userId)
    return serverState
  } catch {
    return local
  }
}
