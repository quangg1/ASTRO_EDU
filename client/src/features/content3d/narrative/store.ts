import { create } from 'zustand'
import type { NarrativeBeat, NarrativeSpace } from '@/features/content3d/narrative/types'
import { narrativeSpaceService } from '@/features/content3d/narrative/service'
import { EARTH_HISTORY_PRESET } from '@/features/content3d/narrative/presets/earth'

interface NarrativeState {
  slug: string
  space: NarrativeSpace
  beats: NarrativeBeat[]
  loading: boolean
  currentBeatIndex: number
  currentBeat: NarrativeBeat
  showTimeline: boolean
  showInfoPanel: boolean
  /** When true, automatic loadSpace() calls are skipped — editor owns the state. */
  editorMode: boolean
  setBeat: (index: number) => void
  setSlug: (slug: string) => void
  loadSpace: (slug?: string) => Promise<void>
  toggleTimeline: () => void
  toggleInfoPanel: () => void
  /** Editor entry point: replace local space with a draft (no API fetch). */
  setDraftSpace: (space: NarrativeSpace, options?: { resetBeatIndex?: boolean }) => void
  setEditorMode: (enabled: boolean) => void
  /** Restore preset (used when leaving editor without saving). */
  resetToPreset: () => void
}

export const useNarrativeStore = create<NarrativeState>((set, get) => ({
  slug: 'earth-history',
  space: EARTH_HISTORY_PRESET,
  beats: EARTH_HISTORY_PRESET.beats,
  loading: false,
  currentBeatIndex: 0,
  currentBeat: EARTH_HISTORY_PRESET.beats[0],
  showTimeline: true,
  showInfoPanel: true,
  editorMode: false,
  setBeat: (index) => {
    const beats = get().beats
    if (index < 0 || index >= beats.length) return
    set({
      currentBeatIndex: index,
      currentBeat: beats[index],
    })
  },
  setSlug: (slug) => set({ slug }),
  loadSpace: async (slugArg) => {
    if (get().editorMode) return
    const slug = slugArg || get().slug
    if (get().loading) return
    set({ loading: true })
    try {
      const space = await narrativeSpaceService.getActiveSpace(slug)
      const beats = space.beats || []
      const idx = beats.length ? Math.min(get().currentBeatIndex, beats.length - 1) : 0
      set({
        slug,
        space,
        beats,
        currentBeatIndex: idx,
        currentBeat: beats[idx] || EARTH_HISTORY_PRESET.beats[0],
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },
  toggleTimeline: () => set((s) => ({ showTimeline: !s.showTimeline })),
  toggleInfoPanel: () => set((s) => ({ showInfoPanel: !s.showInfoPanel })),
  setDraftSpace: (space, options) => {
    const beats = Array.isArray(space.beats) ? space.beats : []
    const safeBeats = beats.length ? beats : EARTH_HISTORY_PRESET.beats
    const prevIndex = get().currentBeatIndex
    const idx = options?.resetBeatIndex
      ? 0
      : Math.min(Math.max(0, prevIndex), Math.max(0, safeBeats.length - 1))
    set({
      slug: space.slug || get().slug,
      space,
      beats: safeBeats,
      currentBeatIndex: idx,
      currentBeat: safeBeats[idx] || EARTH_HISTORY_PRESET.beats[0],
      loading: false,
    })
  },
  setEditorMode: (enabled) => set({ editorMode: enabled }),
  resetToPreset: () => {
    const beats = EARTH_HISTORY_PRESET.beats
    set({
      slug: EARTH_HISTORY_PRESET.slug,
      space: EARTH_HISTORY_PRESET,
      beats,
      currentBeatIndex: 0,
      currentBeat: beats[0],
      editorMode: false,
    })
  },
}))
