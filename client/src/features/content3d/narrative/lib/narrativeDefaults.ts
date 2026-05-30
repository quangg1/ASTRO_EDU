import { DEFAULT_NARRATIVE_VISUAL } from '@/features/content3d/narrative/lib/defaultVisual'
import type { NarrativeBeat, PlanetNarrativeBundle } from '@/features/content3d/narrative/types'

/** Beat trống — không gắn preset Mars/Earth. */
export function createEmptyBeat(id: number, order: number): NarrativeBeat {
  return {
    id,
    order,
    name: `Thời kỳ ${id}`,
    nameEn: `Period ${id}`,
    ageLabelVi: '',
    icon: '🪐',
    accentColor: '#64748b',
    timeMa: 1000,
    panel: {
      descriptionVi: '',
      compareNoteVi: '',
      environmentNoteVi: '',
      pressureCitationVi: '',
      surfaceTempNoteVi: '',
    },
    visual: { ...DEFAULT_NARRATIVE_VISUAL },
    environment: {
      confidence: 'model',
      liquidWater: 'unknown',
      volcanism: 'low',
      surfaceTempMinC: -80,
      surfaceTempMaxC: 20,
      surfacePressureRepresentativePa: 610,
      surfacePressureBasis: 'measured_global_average',
      o2Percent: 21,
      co2Ppm: 420,
      dayLengthHours: 24,
    },
    flags: {},
    majorEvents: [],
  }
}

/** Bundle rỗng cho entity chưa có dữ liệu trong DB. */
export function emptyNarrativeBundle(entityId: string): PlanetNarrativeBundle {
  return {
    entityId,
    kind: 'generic',
    beats: [],
    sites: [],
    published: true,
  }
}
