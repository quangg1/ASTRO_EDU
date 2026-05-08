import { create } from 'zustand'

interface PlaybackState {
  isPlaying: boolean
  playSpeed: number
  togglePlay: () => void
  setPlaySpeed: (speed: number) => void
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  playSpeed: 3000,
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaySpeed: (playSpeed) => set({ playSpeed }),
}))
