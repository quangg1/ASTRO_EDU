/**
 * Rewards / gems surface for other domains (learning-path behavior, dashboard, explore).
 */
export {
  addGemTransaction,
  GEM_REWARD_LEARNING_PATH_LESSON,
  isGuestGemUser,
  loadGemWallet,
  saveGemWallet,
  syncGemWallet,
} from './lib/gemWallet'
export type { GemTransaction, GemWalletState } from './lib/gemWallet'
export {
  fetchLearnerTiersCatalog,
  fetchLearnerTiersWithProgress,
  formatGemsEarnedRange,
} from './api/learnerTiersApi'
export type {
  LearnerTierPublic,
  LearnerTierProgress,
  LearnerTiersCatalog,
} from './api/learnerTiersApi'
export * from './api/showcaseGamificationApi'
export {
  fetchGemShopBootstrap,
  fetchGemShopCatalogPublic,
} from './api/gemShopPublicApi'
export type { GemShopBootstrapDTO, GemShopCatalogItemDTO } from './api/gemShopPublicApi'
export {
  AVATAR_DECORATION_CATEGORY,
  DECORATION_CATEGORY_FALLBACK_ALL,
  DECORATION_CATEGORY_UNCATEGORIZED,
  DECORATION_ADMIN_UNASSIGNED,
  DECORATION_UPDATED_EVENT,
  DEFAULT_DECORATION_BULK_GEM,
  isDecorCategoryBannerSlug,
} from './constants/avatarDecoration'
export {
  sectionsFromDecorationResponse,
  flatItemsFromSections,
  formatDecorationPrice,
} from './lib/decorationCatalog'
export {
  fetchDecorationCatalog,
  fetchMyDecorationState,
  purchaseAvatarDecoration,
  equipAvatarDecoration,
  bulkUploadDecorationOverlaysAdmin,
  uploadDecorationCategoryBannerAdmin,
} from './api/avatarDecorationApi'
export type {
  AvatarDecorationCatalogItem,
  AvatarDecorationCategorySection,
  AvatarDecorationState,
  DecorationBulkImportResult,
} from './api/avatarDecorationApi'
export { useEquippedDecoration } from './hooks/useEquippedDecoration'
export {
  gemActivityDirection,
  gemActivityDirectionLabel,
  labelGemActivityVi,
} from './lib/formatGemActivity'

// Solar journey milestone cache + sync (dashboard / gamification) — PR10
export {
  getSolarJourneyStorageKey,
  loadCompletedMilestoneIds,
  saveCompletedMilestoneIds,
  syncSolarJourneyProgress,
  pushSolarJourneyProgress,
} from './lib/solarJourneyProgress'
