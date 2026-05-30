import { create } from 'zustand'
import { ensureBeatVisual } from '@/features/content3d/narrative/adapters/earthAdapter'
import { studioFallbackBundle } from '@/features/content3d/narrative/lib/legacyPresets'
import type { NarrativeBeat, NarrativeSite, PlanetNarrativeBundle } from '@/features/content3d/narrative/types'
import { fetchPlanetNarrative } from '@/features/content3d/planet-narrative/api/planetNarrativeApi'

function sortBeats(beats: NarrativeBeat[]): NarrativeBeat[] {
  return [...beats].map(ensureBeatVisual).sort((a, b) => a.order - b.order)
}

interface PlanetNarrativeState {
  entityId: string
  beats: NarrativeBeat[]
  sites: NarrativeSite[]
  linkedLessonIds: string[]
  linkedConceptIds: string[]
  narrativeSource: 'preset' | 'db' | 'empty'
  loading: boolean
  currentBeatIndex: number
  currentBeat: NarrativeBeat
  showTimeline: boolean
  showInfoPanel: boolean
  selectedSiteId: string | null
  globeRotationPaused: boolean
  effectDustDemo: boolean
  effectFloodDemo: boolean
  orbitInteracting: boolean
  loadForEntity: (entityId: string) => Promise<void>
  applyBundle: (bundle: PlanetNarrativeBundle) => void
  setBeatIndex: (index: number) => void
  toggleTimeline: () => void
  toggleInfoPanel: () => void
  setSelectedSiteId: (id: string | null) => void
  toggleGlobeRotationPaused: () => void
  toggleEffectDustDemo: () => void
  toggleEffectFloodDemo: () => void
  setOrbitInteracting: (v: boolean) => void
  /** Deep link từ LP / URL — không reset pin khi đổi beat. */
  focusBeatAndSite: (beatId: number, pinId?: string | null) => void
}

function emptyBeat(): NarrativeBeat {
  return ensureBeatVisual({
    id: 0,
    order: 1,
    name: '—',
    nameEn: '—',
    ageLabelVi: '',
    icon: '🪐',
    accentColor: '#94a3b8',
    timeMa: 0,
    panel: {
      descriptionVi: '',
      compareNoteVi: '',
      environmentNoteVi: '',
      pressureCitationVi: '',
      surfaceTempNoteVi: '',
    },
    visual: {
      globeTint: '#94a3b8',
      atmosphereColor: '#64748b',
      atmosphereThickness: 0.1,
      waterCoverage: 0,
      dustOpacity: 0.2,
      volcanicGlow: 0,
    },
    environment: {
      confidence: 'model',
      liquidWater: 'unknown',
      volcanism: 'low',
      surfaceTempMinC: -80,
      surfaceTempMaxC: 20,
      surfacePressureRepresentativePa: 610,
      surfacePressureBasis: 'model_range',
    },
    flags: {},
    majorEvents: [],
  })
}

function stateFromBundle(
  entityId: string,
  bundle: PlanetNarrativeBundle,
  source: 'preset' | 'db',
  prevBeatIndex: number,
): Pick<
  PlanetNarrativeState,
  | 'entityId'
  | 'beats'
  | 'sites'
  | 'linkedLessonIds'
  | 'linkedConceptIds'
  | 'narrativeSource'
  | 'currentBeatIndex'
  | 'currentBeat'
> {
  const beats = sortBeats(bundle.beats)
  const idx = beats.length ? Math.min(prevBeatIndex, beats.length - 1) : 0
  return {
    entityId,
    beats,
    sites: bundle.sites ?? [],
    linkedLessonIds: bundle.linkedLessonIds ?? [],
    linkedConceptIds: bundle.linkedConceptIds ?? [],
    narrativeSource: source,
    currentBeatIndex: idx,
    currentBeat: beats[idx] ?? emptyBeat(),
  }
}

export const usePlanetNarrativeStore = create<PlanetNarrativeState>((set, get) => ({
  entityId: '',
  beats: [],
  sites: [],
  linkedLessonIds: [],
  linkedConceptIds: [],
  narrativeSource: 'empty',
  loading: false,
  currentBeatIndex: 0,
  currentBeat: emptyBeat(),
  showTimeline: true,
  showInfoPanel: true,
  selectedSiteId: null,
  globeRotationPaused: false,
  effectDustDemo: false,
  effectFloodDemo: false,
  orbitInteracting: false,

  loadForEntity: async (entityId) => {
    const id = String(entityId || '').trim()
    if (!id) return
    if (get().loading && get().entityId === id) return
    set({ loading: true, entityId: id })
    try {
      const { data, source } = await fetchPlanetNarrative(id)
      if (data?.beats?.length) {
        set({
          ...stateFromBundle(id, data, source === 'db' ? 'db' : 'preset', get().currentBeatIndex),
          loading: false,
        })
        return
      }
      const fallback = studioFallbackBundle(id)
      if (fallback.beats.length) {
        set({
          ...stateFromBundle(id, fallback, 'preset', 0),
          loading: false,
        })
      } else {
        set({
          loading: false,
          narrativeSource: 'empty',
          beats: [],
          sites: [],
          linkedLessonIds: [],
          linkedConceptIds: [],
          entityId: id,
        })
      }
    } catch {
      set({ loading: false })
    }
  },

  applyBundle: (bundle) => {
    const id = String(bundle.entityId || get().entityId || '').trim()
    if (!id || !bundle.beats?.length) return
    set({
      ...stateFromBundle(id, bundle, 'db', 0),
      selectedSiteId: null,
    })
  },

  setBeatIndex: (index) => {
    const beats = get().beats
    if (index < 0 || index >= beats.length) return
    set({
      currentBeatIndex: index,
      currentBeat: beats[index],
      selectedSiteId: null,
    })
  },

  toggleTimeline: () => set((s) => ({ showTimeline: !s.showTimeline })),
  toggleInfoPanel: () => set((s) => ({ showInfoPanel: !s.showInfoPanel })),
  setSelectedSiteId: (selectedSiteId) => set({ selectedSiteId }),
  toggleGlobeRotationPaused: () => set((s) => ({ globeRotationPaused: !s.globeRotationPaused })),
  toggleEffectDustDemo: () => set((s) => ({ effectDustDemo: !s.effectDustDemo })),
  toggleEffectFloodDemo: () => set((s) => ({ effectFloodDemo: !s.effectFloodDemo })),
  setOrbitInteracting: (orbitInteracting) => set({ orbitInteracting }),

  focusBeatAndSite: (beatId, pinId) => {
    const beats = get().beats
    const idx = beats.findIndex((b) => b.id === beatId)
    if (idx < 0) return
    set({
      currentBeatIndex: idx,
      currentBeat: beats[idx],
      selectedSiteId: pinId != null && String(pinId).trim() ? String(pinId).trim() : null,
    })
  },
}))

/** Studio lưu xong — cập nhật runtime Explore nếu đang mở cùng entity. */
export function applyPlanetNarrativeBundle(bundle: PlanetNarrativeBundle) {
  usePlanetNarrativeStore.getState().applyBundle(bundle)
}
