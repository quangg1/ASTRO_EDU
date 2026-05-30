import { create } from 'zustand'
import type { EarthStage } from '@/features/content3d/earth/lib/earthHistoryTypes'
import { earthHistoryData } from '@/features/content3d/earth/lib/earthHistoryData'
import { loadEarthStages } from '@/features/content3d/earth/lib/loadEarthStages'

/**
 * Earth History scene state.
 *
 * Previously this lived under `features/content3d/narrative/store.ts` as
 * `useNarrativeStore`, dressed up as a generic "narrative space" for
 * arbitrary planets. In practice the only consumer was Earth History — every
 * field on `NarrativeBeat` was an `EarthStage` field. The wrapper was
 * deleted; this store is the honest version: a flat list of Earth geological
 * stages with a current index, plus two HUD visibility toggles.
 */
interface EarthHistoryState {
  stages: EarthStage[]
  loading: boolean
  currentStageIndex: number
  currentStage: EarthStage
  showTimeline: boolean
  showInfoPanel: boolean
  /** Load stages from API; falls back to the built-in static dataset on failure. */
  loadStages: () => Promise<void>
  setStageIndex: (index: number) => void
  toggleTimeline: () => void
  toggleInfoPanel: () => void
}

export const useEarthHistoryStore = create<EarthHistoryState>((set, get) => ({
  stages: earthHistoryData,
  loading: false,
  currentStageIndex: 0,
  currentStage: earthHistoryData[0],
  showTimeline: true,
  showInfoPanel: true,
  loadStages: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const next = await loadEarthStages(earthHistoryData)
      const prevIndex = get().currentStageIndex
      const idx = next.length ? Math.min(prevIndex, next.length - 1) : 0
      set({
        stages: next,
        currentStageIndex: idx,
        currentStage: next[idx] ?? earthHistoryData[0],
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },
  setStageIndex: (index) => {
    const stages = get().stages
    if (index < 0 || index >= stages.length) return
    set({ currentStageIndex: index, currentStage: stages[index] })
  },
  toggleTimeline: () => set((s) => ({ showTimeline: !s.showTimeline })),
  toggleInfoPanel: () => set((s) => ({ showInfoPanel: !s.showInfoPanel })),
}))
