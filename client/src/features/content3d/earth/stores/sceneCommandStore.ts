import { create } from 'zustand'
import type { Fossil, FossilStats } from '@/types'
import type { PhylumInfoFromApi } from '@/features/content3d/earth/api/earthApi'

interface SceneCommandState {
  fossils: Fossil[]
  fossilStats: FossilStats | null
  showFossils: boolean
  fossilsLoading: boolean
  phylumMetadata: Record<string, PhylumInfoFromApi> | null
  showFossilPanel: boolean
  showPlaceLabels: boolean
  showHotspots: boolean
  effectTags: {
    meteorShower: boolean
    debrisField: boolean
    dustHaze: boolean
  }
  flyToTarget: {
    lat: number
    lng: number
    mode?: 'phylum' | 'single'
    phylumFossils?: Fossil[]
  } | null
  earthRotationPaused: boolean
  setFossils: (fossils: Fossil[]) => void
  setFossilStats: (stats: FossilStats | null) => void
  setFossilsLoading: (loading: boolean) => void
  setPhylumMetadata: (data: Record<string, PhylumInfoFromApi> | null) => void
  loadPhylumMetadata: () => Promise<void>
  toggleFossils: () => void
  togglePlaceLabels: () => void
  toggleFossilPanel: () => void
  toggleHotspots: () => void
  toggleEffectTag: (tag: keyof SceneCommandState['effectTags']) => void
  setFlyToTarget: (target: SceneCommandState['flyToTarget']) => void
  setEarthRotationPaused: (paused: boolean) => void
}

export const useSceneCommandStore = create<SceneCommandState>((set) => ({
  fossils: [],
  fossilStats: null,
  showFossils: true,
  fossilsLoading: false,
  phylumMetadata: null,
  showFossilPanel: true,
  showPlaceLabels: true,
  showHotspots: true,
  effectTags: { meteorShower: true, debrisField: true, dustHaze: true },
  flyToTarget: null,
  earthRotationPaused: false,
  setFossils: (fossils) => set({ fossils }),
  setFossilStats: (fossilStats) => set({ fossilStats }),
  setFossilsLoading: (fossilsLoading) => set({ fossilsLoading }),
  setPhylumMetadata: (phylumMetadata) => set({ phylumMetadata }),
  loadPhylumMetadata: async () => {
    const { fetchPhylumMetadata } = await import('@/features/content3d/earth/api/earthApi')
    const data = await fetchPhylumMetadata('vi')
    set({ phylumMetadata: data })
  },
  toggleFossils: () => set((s) => ({ showFossils: !s.showFossils })),
  togglePlaceLabels: () => set((s) => ({ showPlaceLabels: !s.showPlaceLabels })),
  toggleFossilPanel: () => set((s) => ({ showFossilPanel: !s.showFossilPanel })),
  toggleHotspots: () => set((s) => ({ showHotspots: !s.showHotspots })),
  toggleEffectTag: (tag) => set((s) => ({ effectTags: { ...s.effectTags, [tag]: !s.effectTags[tag] } })),
  setFlyToTarget: (flyToTarget) => set({ flyToTarget }),
  setEarthRotationPaused: (earthRotationPaused) => set({ earthRotationPaused }),
}))
