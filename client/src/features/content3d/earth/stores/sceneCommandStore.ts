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
    /** Khi bay tới một hóa thạch cụ thể — giữ sau khi animation xong để hiển thị nhãn tên. */
    fossil?: Fossil | null
  } | null
  /** Sau fly-to / chọn từ danh sách — pulse + nhãn tên trên globe. */
  focusedFossil: Fossil | null
  fossilDetailOpen: boolean
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
  setFocusedFossil: (fossil: Fossil | null) => void
  setFossilDetailOpen: (open: boolean) => void
  clearFossilFocus: () => void
  /** Fly-to + nhãn + panel chi tiết (không đụng rotation pause). */
  clearAllGlobeFossilUi: () => void
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
  focusedFossil: null,
  fossilDetailOpen: false,
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
  setFocusedFossil: (focusedFossil) => set({ focusedFossil }),
  setFossilDetailOpen: (fossilDetailOpen) => set({ fossilDetailOpen }),
  clearFossilFocus: () => set({ focusedFossil: null, fossilDetailOpen: false }),
  clearAllGlobeFossilUi: () =>
    set({ flyToTarget: null, focusedFossil: null, fossilDetailOpen: false }),
  setEarthRotationPaused: (earthRotationPaused) => set({ earthRotationPaused }),
}))
