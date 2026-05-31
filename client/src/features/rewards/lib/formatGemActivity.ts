import type { GemTransaction } from '@/features/rewards/api/gemsWalletApi'

const REASON_LABELS: Record<string, string> = {
  lp_complete_dwell: 'Hoàn thành bài học (đủ thời gian đọc)',
  depth_complete: 'Hoàn thành mức độ sâu bài học',
  recall_quiz_first: 'Đạt quiz nhớ lần đầu',
  recall_quiz_retry: 'Đạt quiz nhớ khi ôn lại',
  scene_entity_discovered: 'Khám phá vật thể 3D mới',
  scene_contextual_quiz_passed: 'Quiz ngữ cảnh Explore',
  dh_beat_dwell: 'Xem Deep History (đủ thời gian)',
  dh_site_opened: 'Mở điểm Deep History',
  community_post: 'Cộng đồng — đăng bài thảo luận',
  community_helpful_answer: 'Cộng đồng — câu trả lời hữu ích',
  community_helpful_vote: 'Cộng đồng — nhận upvote hữu ích',
  onboarding_complete: 'Hoàn thành onboarding cá nhân hóa',
  showcase_unlock: 'Mở khóa nội dung Showcase',
  shop_avatar_decoration: 'Mua trang trí avatar',
  admin_manual_adjust: 'Điều chỉnh từ quản trị viên',
  lesson_complete: 'Hoàn thành bài học trong lộ trình',
}

const DEPTH_LABELS: Record<string, string> = {
  beginner: 'Người mới',
  explorer: 'Khám phá',
  researcher: 'Nghiên cứu',
}

function humanizeReasonCode(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Nhãn tiếng Việt cho `GemTransaction.reason` (server + legacy client). */
export function labelGemActivityVi(tx: Pick<GemTransaction, 'reason' | 'type' | 'amount' | 'meta'>): string {
  const key = String(tx.reason || tx.type || '').trim()
  if (!key) return tx.amount >= 0 ? 'Nhận Gem' : 'Tiêu Gem'

  if (key === 'depth_complete') {
    const depth = String(tx.meta?.depth || '').trim()
    const depthLabel = DEPTH_LABELS[depth]
    return depthLabel ? `Hoàn thành mức ${depthLabel}` : REASON_LABELS.depth_complete
  }

  if (REASON_LABELS[key]) return REASON_LABELS[key]

  if (/earned for completing a lesson/i.test(key)) {
    return REASON_LABELS.lesson_complete
  }

  return humanizeReasonCode(key)
}

export function gemActivityDirection(tx: Pick<GemTransaction, 'amount'>): 'earn' | 'spend' {
  return tx.amount >= 0 ? 'earn' : 'spend'
}

export function gemActivityDirectionLabel(tx: Pick<GemTransaction, 'amount'>): string {
  return gemActivityDirection(tx) === 'earn' ? 'Kiếm' : 'Tiêu'
}
