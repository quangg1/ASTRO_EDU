import {
  DECORATION_CATEGORY_FALLBACK_ALL,
} from '@/features/rewards/constants/avatarDecoration'
import type {
  AvatarDecorationCatalogItem,
  AvatarDecorationCategorySection,
} from '@/features/rewards/api/avatarDecorationApi'

export function sectionsFromDecorationResponse(
  categories: AvatarDecorationCategorySection[] | undefined,
  items: AvatarDecorationCatalogItem[],
  fallbackTitle = 'Trang trí avatar',
): AvatarDecorationCategorySection[] {
  if (categories?.length) return categories
  if (!items.length) return []
  return [
    {
      slug: DECORATION_CATEGORY_FALLBACK_ALL,
      nameVi: fallbackTitle,
      subtitleVi: '',
      bannerUrl: '',
      sortOrder: 0,
      items,
    },
  ]
}

export function flatItemsFromSections(
  sections: AvatarDecorationCategorySection[],
): AvatarDecorationCatalogItem[] {
  return sections.flatMap((s) => s.items || [])
}

export function formatDecorationPrice(gems: number): string {
  return gems <= 0 ? 'Miễn phí' : `${gems} gem`
}
