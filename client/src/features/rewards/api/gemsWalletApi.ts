import { parseGemWalletResponse, type GemTransaction as ContractGemTransaction } from '@galaxies/contracts'
import { getApiPathBase } from '@/lib/apiConfig'
import { apiFetch } from '@/lib/apiRequestInit'
import type { LearnerTierProgress } from './learnerTiersApi'

const API = `${getApiPathBase()}/gems`

export interface GemWalletState {
  balance: number
  level?: number
  totalGemsEarned?: number
  learnerTier?: LearnerTierProgress
  transactions: GemTransaction[]
}

export type GemTransaction = ContractGemTransaction & {
  meta?: ContractGemTransaction['meta'] & Record<string, unknown>
}

/** GET /gems/wallet — server source of truth when authenticated. */
export async function fetchGemWalletFromServer(): Promise<GemWalletState | null> {
  try {
    const res = await apiFetch(`${API}/wallet`)
    const data = await res.json()
    if (!data?.success || !data?.data) return null
    const parsed = parseGemWalletResponse(data)
    return {
      balance: parsed.balance,
      level: parsed.level,
      totalGemsEarned: parsed.totalGemsEarned,
      learnerTier: parsed.learnerTier as LearnerTierProgress | undefined,
      transactions: parsed.transactions,
    }
  } catch {
    return null
  }
}
