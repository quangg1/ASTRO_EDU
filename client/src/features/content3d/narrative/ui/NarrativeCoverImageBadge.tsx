'use client'

import type { NarrativeSite } from '@/features/content3d/narrative/types'

type NarrativeCoverImageType = NonNullable<NarrativeSite['coverImageType']>

const LABELS: Record<NarrativeCoverImageType, string> = {
  orbital_modern: '🛰 Ảnh orbital hiện đại — không phải cảnh cổ đại',
  surface_modern: '📷 Ảnh bề mặt hiện đại (rover/orbiter)',
  artistic: '🎨 Minh họa nghệ thuật / tái dựng',
}

export function NarrativeCoverImageBadge({ type }: { type: NarrativeCoverImageType }) {
  if (type === 'artistic') {
    return (
      <span
        className="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium leading-tight"
        style={{
          background: '#1a1030',
          color: '#c4b5fd',
          borderColor: 'rgba(196,181,253,0.45)',
        }}
      >
        {LABELS.artistic}
      </span>
    )
  }

  if (type === 'surface_modern') {
    return (
      <span
        className="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium leading-tight"
        style={{
          background: '#0a1a22',
          color: '#67e8f9',
          borderColor: 'rgba(103,232,249,0.4)',
        }}
      >
        {LABELS.surface_modern}
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium leading-tight"
      style={{
        background: '#2a1800',
        color: '#F0A020',
        borderColor: 'rgba(240,160,32,0.38)',
      }}
    >
      {LABELS.orbital_modern}
    </span>
  )
}

/** Ảnh NASA/JPL tại tọa độ hiện đại — nhấn mạnh khi beat là paleo. */
export function resolveNarrativeCoverImageType(
  site: { coverImageType?: NarrativeCoverImageType },
  paleoStage: boolean,
): NarrativeCoverImageType | null {
  if (site.coverImageType) return site.coverImageType
  if (paleoStage) return 'orbital_modern'
  return null
}
