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
  setPlaySpeed: (playSpeed) =>
    set((s) => ({
      playSpeed: Math.max(0, playSpeed),
      /** 0x = không tự chạy — tránh interval “chạy im” gây nhầm. */
      isPlaying: playSpeed <= 0 ? false : s.isPlaying,
    })),
}))
