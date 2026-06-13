import { labelGemActivityVi } from '@/features/rewards/lib/formatGemActivity'

export const ADMIN_SCOPE_OPTIONS = [
  { id: 'users', label: 'Người dùng' },
  { id: 'teachers', label: 'Đơn giáo viên' },
  { id: 'orders', label: 'Đơn hàng' },
  { id: 'courses', label: 'Khóa học' },
  { id: 'moderation', label: 'Kiểm duyệt' },
  { id: 'gem', label: 'Gem & cửa hàng' },
  { id: 'promo', label: 'Coupon' },
  { id: 'broadcast', label: 'Thông báo broadcast' },
  { id: 'analytics', label: 'Phân tích & tổng quan' },
  { id: 'system', label: 'Hệ thống' },
  { id: 'audit', label: 'Nhật ký kiểm tra' },
] as const

export type AdminScope = (typeof ADMIN_SCOPE_OPTIONS)[number]['id']

const ROLE_LABELS: Record<string, string> = {
  student: 'Học viên',
  teacher: 'Giáo viên',
  moderator: 'Điều hành viên',
  admin: 'Quản trị viên',
}

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  deactivated: 'Ngừng hoạt động',
}

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  active: 'Đang học',
  trial: 'Dùng thử',
  expired: 'Hết hạn',
}

const GEM_ECONOMY_ACTION_LABELS: Record<string, string> = {
  manual_gem_adjust: 'Điều chỉnh gem thủ công',
  runtime_config_patch: 'Sửa cấu hình vận hành',
  shop_item_create: 'Tạo mã hàng cửa hàng',
  shop_item_update: 'Cập nhật mã hàng cửa hàng',
  decoration_category_create: 'Tạo danh mục trang trí',
  decoration_category_update: 'Cập nhật danh mục trang trí',
  decoration_bulk_import: 'Nhập hàng loạt trang trí avatar',
}

const GEM_TXN_SIGN_LABELS: Record<string, string> = {
  earn: 'Thu',
  spend: 'Chi',
}

function humanizeCode(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function labelUserRoleVi(role: string | undefined | null): string {
  const key = String(role || '').trim()
  return ROLE_LABELS[key] || humanizeCode(key)
}

export function labelAccountStatusVi(status: string | undefined | null): string {
  const key = String(status || '').trim()
  return ACCOUNT_STATUS_LABELS[key] || humanizeCode(key)
}

export function labelEnrollmentStatusVi(status: string | undefined | null): string {
  const key = String(status || '').trim()
  return ENROLLMENT_STATUS_LABELS[key] || humanizeCode(key)
}

const GEM_EARN_LABELS: Record<string, string> = {
  lp_complete_dwell: 'Hoàn thành bài học (đủ thời gian đọc)',
  depth_beginner: 'Hoàn thành mức Cơ bản',
  depth_explorer: 'Hoàn thành mức Cơ chế',
  depth_researcher: 'Hoàn thành mức Chuyên sâu',
  recall_quiz_first: 'Đạt quiz nhớ lần đầu',
  recall_quiz_retry: 'Đạt quiz nhớ khi ôn lại',
  scene_entity_discovered: 'Khám phá vật thể 3D mới',
  dh_beat_dwell: 'Xem Deep History (đủ thời gian)',
  dh_site_opened: 'Mở điểm Deep History',
  community_post: 'Cộng đồng — đăng bài thảo luận',
  community_helpful_answer: 'Cộng đồng — câu trả lời hữu ích',
  community_helpful_vote: 'Cộng đồng — nhận upvote hữu ích',
  onboarding_complete: 'Hoàn thành onboarding cá nhân hóa',
  astronomy_event_observed: 'Quan sát sự kiện thiên văn (check-in)',
}

export function labelGemEarnConstant(key: string | undefined | null): string {
  const k = String(key || '').trim()
  if (!k) return '—'
  return GEM_EARN_LABELS[k] || labelGemReasonCode(k)
}

export function labelGemReasonCode(code: string | undefined | null): string {
  const key = String(code || '').trim()
  if (!key) return '—'
  return labelGemActivityVi({ reason: key, type: key, amount: 1, meta: {} })
}

export function labelGemEconomyActionVi(action: string | undefined | null): string {
  const key = String(action || '').trim()
  if (!key) return '—'
  return GEM_ECONOMY_ACTION_LABELS[key] || humanizeCode(key)
}

export function labelGemTxnSignVi(sign: string | undefined | null): string {
  const key = String(sign || '').trim()
  return GEM_TXN_SIGN_LABELS[key] || humanizeCode(key)
}

export function labelAdminScopeVi(scope: string | undefined | null): string {
  const key = String(scope || '').trim()
  if (key === '*') return 'Toàn quyền'
  const found = ADMIN_SCOPE_OPTIONS.find((o) => o.id === key)
  return found?.label || humanizeCode(key)
}

export function formatAdminScopesSummary(scopes: string[] | undefined | null): string {
  if (!scopes?.length) return 'Toàn quyền'
  if (scopes.includes('*')) return 'Toàn quyền'
  return scopes.map((s) => labelAdminScopeVi(s)).join(', ')
}

export const ADMIN_NAV_SCOPES: Record<string, AdminScope> = {
  '/admin': 'analytics',
  '/admin/users': 'users',
  '/admin/orders': 'orders',
  '/admin/courses': 'courses',
  '/admin/moderation': 'moderation',
  '/admin/audit': 'audit',
  '/admin/system': 'system',
  '/admin/astronomy-calendar': 'system',
  '/admin/gem-economy': 'gem',
  '/admin/promo-codes': 'promo',
  '/admin/broadcast': 'broadcast',
}

export function adminScopeForPath(pathname: string): AdminScope | null {
  if (pathname === '/admin') return 'analytics'
  if (pathname.startsWith('/admin/users')) return 'users'
  const match = Object.entries(ADMIN_NAV_SCOPES).find(
    ([href]) => href !== '/admin' && pathname.startsWith(href),
  )
  return match?.[1] ?? null
}
