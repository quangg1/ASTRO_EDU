/**
 * Gem wallet client cache. When the user is authenticated, **`syncGemWallet` → GET /gems/wallet**
 * is the source of truth; localStorage is a guest/offline cache only.
 */
import { hasClientSession, getUserFromStoredToken } from '@/features/auth/public'
import { fetchGemWalletFromServer, type GemTransaction, type GemWalletState } from '@/features/rewards/api/gemsWalletApi'

export type { GemTransaction, GemWalletState }
export { fetchGemWalletFromServer }

const PREFIX = 'cosmo-gem-wallet-v1'

/** Mirror server base — chỉ hiển thị UI; earn thật do server quyết định (× seasonal). */
export const GEM_REWARD_LEARNING_PATH_LESSON = 5
export const GEM_EARN_CONTEXTUAL_QUIZ = 3

function walletKey(userId?: string | null): string {
  const id = userId != null && String(userId).trim() ? String(userId).trim() : 'guest'
  return `${PREFIX}:user:${id}`
}

export function isGuestGemUser(userId?: string | null): boolean {
  return userId == null || String(userId).trim() === ''
}

/** Khách chưa đăng nhập — không fake balance (G6). */
function createGuestWallet(): GemWalletState {
  return { balance: 0, transactions: [] }
}

function emptyAuthenticatedWallet(): GemWalletState {
  return { balance: 0, transactions: [] }
}

export function loadGemWallet(userId?: string | null): GemWalletState {
  if (isGuestGemUser(userId)) return createGuestWallet()
  if (typeof window === 'undefined') return emptyAuthenticatedWallet()
  try {
    const raw = localStorage.getItem(walletKey(userId))
    if (!raw) return emptyAuthenticatedWallet()
    const parsed = JSON.parse(raw) as Partial<GemWalletState>
    const tx = Array.isArray(parsed?.transactions) ? parsed.transactions : []
    const balance = typeof parsed?.balance === 'number' ? parsed.balance : 0
    const level = typeof parsed?.level === 'number' ? parsed.level : undefined
    const totalGemsEarned =
      typeof parsed?.totalGemsEarned === 'number' ? parsed.totalGemsEarned : undefined
    const learnerTier = parsed?.learnerTier
    return {
      balance,
      level,
      totalGemsEarned,
      learnerTier,
      transactions: tx
        .filter((item): item is GemTransaction => !!item && typeof item.id === 'string')
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    }
  } catch {
    return emptyAuthenticatedWallet()
  }
}

export function saveGemWallet(state: GemWalletState, userId?: string | null) {
  if (typeof window === 'undefined' || isGuestGemUser(userId)) return
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
    level: current.level,
    transactions: [nextTx, ...current.transactions],
  }
  saveGemWallet(next, userId)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gem-wallet-changed'))
  }
  return next
}

export async function syncGemWallet(userId?: string | null): Promise<GemWalletState> {
  const uid = userId ?? getUserFromStoredToken()?.id ?? null
  if (isGuestGemUser(uid)) return createGuestWallet()
  const local = loadGemWallet(uid)
  if (!hasClientSession() || !uid) return local
  const serverState = await fetchGemWalletFromServer()
  if (!serverState) return local
  saveGemWallet(serverState, uid)
  return serverState
}
