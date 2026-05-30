/** ShopItem.category — đồng bộ với services/api/features/rewards/constants/avatarDecoration.js */
export const AVATAR_DECORATION_CATEGORY = 'avatar_decoration' as const

/** Slug ảo khi catalog phẳng / item chưa gán nhóm (đồng bộ API). */
export const DECORATION_CATEGORY_FALLBACK_ALL = '_all'
export const DECORATION_CATEGORY_UNCATEGORIZED = '_other'
export const DECORATION_ADMIN_UNASSIGNED = '_none'

export const DEFAULT_DECORATION_BULK_GEM = 0

export const DECORATION_UPDATED_EVENT = 'galaxies:decoration-updated'

export function isDecorCategoryBannerSlug(slug: string): boolean {
  return slug !== DECORATION_CATEGORY_FALLBACK_ALL && slug !== DECORATION_CATEGORY_UNCATEGORIZED
}
