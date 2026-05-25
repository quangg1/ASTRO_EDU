/**
 * Public surface for the admin domain.
 *
 * Admin orchestrates resources owned by other domains (users from auth,
 * orders from payment, learning-path/posts metrics from analytics). This
 * barrel re-exports the admin-facing slice of each one so `app/admin/page.tsx`
 * (and future admin pages) need only `@/features/admin/public`.
 *
 * Note on session helpers: admin API files import `getToken` deep from
 * `@/features/auth/api/authApi` (not via `auth/public`) to keep the admin
 * barrel free of the auth Zustand store dependency.
 *
 * @see DOMAIN_MAP.md §3
 */

// User management (admin-side) -------------------------------------------------
export {
  fetchAdminUsers,
  updateUserRole,
  updateUserStatus,
} from './api/adminUsersApi'
export type {
  AdminUser,
  UserRole,
  AccountStatus,
} from './api/adminUsersApi'

// Teacher applications — admin-side review --------------------------------------
// User-side submit/status live in `features/auth/public`. The DTOs are shared,
// so we re-export them here as well for ergonomic typing in admin views.
export {
  fetchAdminTeacherApplications,
  reviewTeacherApplication,
} from '@/features/auth/public'
export type { TeacherApplication, TeacherApplicationWithUser } from '@/features/auth/public'

// Analytics (cross-domain reporting) -------------------------------------------
export {
  fetchAdminAnalyticsOverview,
  fetchAdminAnalyticsFunnel,
  fetchAdminAnalyticsRetention,
  fetchAdminAnalyticsCohort,
  fetchAdminLearningPathAnalytics,
} from './api/adminAnalyticsApi'
export type {
  AnalyticsRange,
  AdminAnalyticsOverview,
  AdminAnalyticsFunnelItem,
  AdminAnalyticsRetention,
  AdminAnalyticsCohort,
  AdminLearningPathFunnelItem,
  AdminLearningPathAnalytics,
} from './api/adminAnalyticsApi'

// Gem economy (bounded config + metrics) --------------------------------------
export {
  fetchGemEarnConstants,
  fetchGemRuntimeConfig,
  fetchGemEconomyMetrics,
  patchGemRuntimeConfig,
  fetchAdminShopItems,
  createAdminShopItem,
  patchAdminShopItem,
  postManualGemAdjust,
  fetchGemEconomyAuditLog,
  fetchDecorationCategoriesAdmin,
  createDecorationCategoryAdmin,
  patchDecorationCategoryAdmin,
} from './api/adminGemEconomyApi'
export type {
  GemEarnConstantsResponse,
  GemRuntimeConfigDTO,
  GemEconomyMetricsDTO,
  GemEconomySupply,
  GemEconomyVelocity,
  ShopItemAdminDTO,
  GemEconomyAuditDTO,
  DecorationCategoryAdminDTO,
} from './api/adminGemEconomyApi'
export type { DecorationBulkImportResult } from '@/features/rewards/public'

export { sendAdminBroadcast } from './api/adminBroadcastApi'
export type { BroadcastRole } from './api/adminBroadcastApi'

export {
  fetchAdminPromoCodes,
  createAdminPromoCode,
  patchAdminPromoCode,
  deleteAdminPromoCode,
} from './api/adminPromoCodesApi'
export type { PromoCodeAdmin } from './api/adminPromoCodesApi'
