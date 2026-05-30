'use client'

import { DecorationCatalogExperience } from '@/components/rewards/DecorationCatalogExperience'
import type { AvatarDecorationCategorySection } from '@/features/rewards/api/avatarDecorationApi'

type Props = {
  categories: AvatarDecorationCategorySection[]
  avatarUrl: string | null | undefined
  displayName: string
  email?: string | null
}

/** Cửa hàng Gem — wrapper mỏng (logic trong DecorationCatalogExperience). */
export function GemShopDecorationCatalog({ categories, avatarUrl, displayName, email }: Props) {
  return (
    <DecorationCatalogExperience
      mode="shop"
      categories={categories}
      avatarUrl={avatarUrl}
      displayName={displayName}
      email={email}
    />
  )
}
