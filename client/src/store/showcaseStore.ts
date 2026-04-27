import * as THREE from 'three'
import { create } from 'zustand'
import type { RefObject } from 'react'

type ShowcaseStore = {
  preloadGroup: string | null
  setPreloadGroup: (g: string | null) => void
  /** World-space focus for catalog studio light */
  focusedStudioPosition: THREE.Vector3 | null
  setFocusedStudioPosition: (v: THREE.Vector3 | null) => void
  /**
   * When true, ShowcaseCameraManager stops scripted framing so OrbitControls (wheel / drag) wins.
   * Reset to false when the catalog focus key (entity + planet) changes.
   */
  showcaseCameraUserOverride: boolean
  setShowcaseCameraUserOverride: (v: boolean) => void
  /** Camera distance from heliocentric origin (Sun at 0,0,0). */
  cameraDistanceToSun: number
  setCameraDistanceToSun: (d: number) => void
  focusedEntity: string | null
  setFocusedEntity: (id: string | null) => void
  studioLightRef: RefObject<THREE.PointLight> | null
  setStudioLightRef: (r: RefObject<THREE.PointLight> | null) => void
}

export const useShowcaseStore = create<ShowcaseStore>((set) => ({
  preloadGroup: null,
  setPreloadGroup: (g) => set({ preloadGroup: g }),
  focusedStudioPosition: null,
  setFocusedStudioPosition: (v) => set({ focusedStudioPosition: v }),
  showcaseCameraUserOverride: false,
  setShowcaseCameraUserOverride: (v) => set({ showcaseCameraUserOverride: v }),
  cameraDistanceToSun: 0,
  setCameraDistanceToSun: (d) => set({ cameraDistanceToSun: d }),
  focusedEntity: null,
  setFocusedEntity: (id) => set({ focusedEntity: id }),
  studioLightRef: null,
  setStudioLightRef: (r) => set({ studioLightRef: r }),
}))
