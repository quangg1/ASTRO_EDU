import { syncGemWallet } from '@/features/rewards/public'
import type { CommunityGemReward } from '@/features/community/api/communityApi'

/** Đồng bộ ví sau khi server trả gemReward từ hành động cộng đồng. */
export async function syncCommunityGemReward(reward: CommunityGemReward | null | undefined): Promise<boolean> {
  if (!reward?.gemsEarned || reward.gemsEarned <= 0) return false
  if (typeof window === 'undefined') return false
  await syncGemWallet()
  window.dispatchEvent(new CustomEvent('gem-wallet-changed'))
  return true
}
