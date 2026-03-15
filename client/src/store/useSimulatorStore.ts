import { create } from 'zustand'
import { EarthStage, Fossil, FossilStats } from '@/types'
import { earthHistoryData } from '@/lib/earthHistoryData'
import type { PhylumInfoFromApi } from '@/lib/api'

interface SimulatorState {
  /** Danh sách stages (từ API hoặc fallback static). Dùng cho Timeline, Controls, currentStage. */
  stages: EarthStage[]
  stagesLoading: boolean
  // Current stage (derived from stages[currentStageIndex])
  currentStageIndex: number
  currentStage: EarthStage

  // Fossils
  fossils: Fossil[]
  fossilStats: FossilStats | null
  showFossils: boolean
  fossilsLoading: boolean
  /** Metadata phylum từ MongoDB (nameVi, description, color). null = chưa load. */
  phylumMetadata: Record<string, PhylumInfoFromApi> | null
  
  // Playback
  isPlaying: boolean
  playSpeed: number // ms per stage
  
  // UI
  showTimeline: boolean
  showInfoPanel: boolean
  showFossilPanel: boolean
  /** Hiển thị nhãn địa danh (thành phố / vùng) trên quả cầu khi thời kỳ hiện đại */
  showPlaceLabels: boolean
  
  /** Fly-to: centroid (lat,lng). mode 'phylum' = vẽ đường nối các mẫu; 'single' = zoom + marker 1 mẫu. */
  flyToTarget: {
    lat: number
    lng: number
    mode?: 'phylum' | 'single'
    phylumFossils?: Fossil[]
  } | null
  // Dừng quay Trái Đất khi user xem một vùng (sau khi nhấn vào chủng hóa thạch)
  earthRotationPaused: boolean
  
  // Actions
  setStage: (index: number) => void
  nextStage: () => void
  prevStage: () => void
  togglePlay: () => void
  setPlaySpeed: (speed: number) => void
  setFossils: (fossils: Fossil[]) => void
  setFossilStats: (stats: FossilStats | null) => void
  setFossilsLoading: (loading: boolean) => void
  setPhylumMetadata: (data: Record<string, PhylumInfoFromApi> | null) => void
  loadPhylumMetadata: () => Promise<void>
  toggleFossils: () => void
  togglePlaceLabels: () => void
  toggleTimeline: () => void
  toggleInfoPanel: () => void
  toggleFossilPanel: () => void
  setFlyToTarget: (target: SimulatorState['flyToTarget']) => void
  setEarthRotationPaused: (paused: boolean) => void
  /** Gọi khi mở Explore/Earth History: fetch stages từ API, fallback static. */
  loadStages: () => Promise<void>
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  // Initial state: dùng static data cho đến khi load API xong
  stages: earthHistoryData,
  stagesLoading: false,
  currentStageIndex: 0,
  currentStage: earthHistoryData[0],
  
  fossils: [],
  fossilStats: null,
  showFossils: true,
  fossilsLoading: false,
  phylumMetadata: null,
  
  isPlaying: false,
  playSpeed: 3000,
  
  showTimeline: true,
  showInfoPanel: true,
  showFossilPanel: true,
  showPlaceLabels: true,
  flyToTarget: null,
  earthRotationPaused: false,

  // Actions
  setStage: (index) => {
    const { stages } = get()
    if (index >= 0 && index < stages.length) {
      set({
        currentStageIndex: index,
        currentStage: stages[index],
        fossils: [], // Clear fossils when changing stage
      })
    }
  },
  
  nextStage: () => {
    const { currentStageIndex, stages } = get()
    const nextIndex = currentStageIndex < stages.length - 1 
      ? currentStageIndex + 1 
      : 0 // Loop back
    get().setStage(nextIndex)
  },
  
  prevStage: () => {
    const { currentStageIndex } = get()
    if (currentStageIndex > 0) {
      get().setStage(currentStageIndex - 1)
    }
  },

  loadStages: async () => {
    const { stagesLoading } = get()
    if (stagesLoading) return
    set({ stagesLoading: true })
    try {
      const { fetchEarthHistoryStages } = await import('@/lib/earthHistoryApi')
      const fromApi = await fetchEarthHistoryStages()
      if (fromApi.length > 0) {
        const { currentStageIndex } = get()
        const idx = Math.min(currentStageIndex, fromApi.length - 1)
        set({
          stages: fromApi,
          currentStageIndex: idx,
          currentStage: fromApi[idx],
          stagesLoading: false,
        })
      } else {
        set({ stagesLoading: false })
      }
    } catch {
      set({ stagesLoading: false })
    }
  },
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setPlaySpeed: (speed) => set({ playSpeed: speed }),
  
  setFossils: (fossils) => set({ fossils }),
  
  setFossilStats: (stats) => set({ fossilStats: stats }),
  
  setFossilsLoading: (loading) => set({ fossilsLoading: loading }),
  setPhylumMetadata: (data) => set({ phylumMetadata: data }),
  loadPhylumMetadata: async () => {
    const { fetchPhylumMetadata } = await import('@/lib/api')
    const data = await fetchPhylumMetadata('vi')
    set({ phylumMetadata: data })
  },
  toggleFossils: () => set((state) => ({ showFossils: !state.showFossils })),
  togglePlaceLabels: () => set((state) => ({ showPlaceLabels: !state.showPlaceLabels })),

  toggleTimeline: () => set((state) => ({ showTimeline: !state.showTimeline })),
  
  toggleInfoPanel: () => set((state) => ({ showInfoPanel: !state.showInfoPanel })),
  
  toggleFossilPanel: () => set((state) => ({ showFossilPanel: !state.showFossilPanel })),
  setFlyToTarget: (target) => set({ flyToTarget: target }),
  setEarthRotationPaused: (paused) => set({ earthRotationPaused: paused }),
}))
