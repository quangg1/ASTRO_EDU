'use client'

import { DecorationCatalogExperience } from '@/components/rewards/DecorationCatalogExperience'

type Props = {
  avatarUrl: string
  displayName: string
  email?: string | null
}

/** Hồ sơ — trang trí avatar (wrapper mỏng). */
export function AvatarDecorationPicker({ avatarUrl, displayName, email }: Props) {
  return (
    <DecorationCatalogExperience
      mode="profile"
      avatarUrl={avatarUrl}
      displayName={displayName}
      email={email}
    />
  )
}
