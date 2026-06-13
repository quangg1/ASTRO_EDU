import { hasClientSession } from '@/features/auth/public'
import { getApiPathBase } from '@/lib/apiConfig'
import { fetchGemWalletFromServer } from './gemsWalletApi'

const API = `${getApiPathBase()}/gems`

export interface LearnerTierPerk {
  id: string
  labelVi: string
  highlight: boolean
}

export interface LearnerTierPublic {
  id: string
  order: number
  emoji: string
  nameVi: string
  taglineVi: string
  minGemsEarned: number
  maxGemsEarned: number | null
  checkoutDiscountPct: number
  perks: LearnerTierPerk[]
}

export interface LearnerTierProgress {
  current: LearnerTierPublic
  next: LearnerTierPublic | null
  gemsEarned: number
  gemsToNext: number
  progressPct: number
}

export interface LearnerTiersCatalog {
  tiers: LearnerTierPublic[]
  policyVi: string
}

export async function fetchLearnerTiersCatalog(): Promise<LearnerTiersCatalog | null> {
  try {
    const res = await fetch(`${API}/learner-tiers`, { cache: 'no-store' })
    const data = await res.json()
    if (!data?.success || !data?.data?.tiers) return null
    return {
      tiers: data.data.tiers as LearnerTierPublic[],
      policyVi: String(data.data.policyVi || ''),
    }
  } catch {
    return null
  }
}

/** Catalog + tiến độ user (nếu đăng nhập). */
export async function fetchLearnerTiersWithProgress(): Promise<{
  catalog: LearnerTiersCatalog
  progress: LearnerTierProgress | null
  gemBalance: number
} | null> {
  const catalog = await fetchLearnerTiersCatalog()
  if (!catalog) return null
  if (!hasClientSession()) {
    return { catalog, progress: null, gemBalance: 0 }
  }
  const wallet = await fetchGemWalletFromServer()
  return {
    catalog,
    progress: wallet?.learnerTier ?? null,
    gemBalance: wallet?.balance ?? 0,
  }
}

export function formatGemsEarnedRange(tier: LearnerTierPublic): string {
  if (tier.maxGemsEarned == null) {
    return `${tier.minGemsEarned.toLocaleString('vi-VN')}+ gem đã kiếm`
  }
  if (tier.minGemsEarned <= 0) {
    return `0 – ${tier.maxGemsEarned.toLocaleString('vi-VN')} gem`
  }
  return `${tier.minGemsEarned.toLocaleString('vi-VN')} – ${tier.maxGemsEarned.toLocaleString('vi-VN')} gem`
}
