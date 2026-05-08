import { earthHistoryData } from '@/features/content3d/earth/lib/earthHistoryData'
import type { NarrativeSpace } from '@/features/content3d/narrative/types'

export const EARTH_HISTORY_PRESET: NarrativeSpace = {
  id: 'preset-earth-history',
  slug: 'earth-history',
  version: '1.0.0',
  title: { vi: 'Earth History', en: 'Earth History' },
  templateId: 'deep-time-journey',
  world: {
    bodySlug: 'earth',
    atmospherePreset: 'earth-modern',
    colorGrade: 'earth-neutral',
    effectTags: ['meteor_shower', 'debris_field', 'dust_haze'],
    lightingPreset: 'solar-default',
  },
  sequence: { type: 'geologic_ma', unit: 'Ma', range: [4600, 0], direction: 'reverse' },
  beats: earthHistoryData,
  meta: {
    verified: true,
    sourceRefs: [{ label: 'Built-in Earth History preset' }],
  },
}
