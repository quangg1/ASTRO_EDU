import * as THREE from 'three'
import type { NarrativeBeatVisual } from '@/features/content3d/narrative/types'

export function cloneBeatVisual(v: NarrativeBeatVisual): NarrativeBeatVisual {
  return { ...v }
}

export function resolveBeatVisual(beat: { id: number; visual: NarrativeBeatVisual }): NarrativeBeatVisual {
  return beat.visual
}

/** Lerp visual uniforms khi đổi beat timeline. */
export function lerpBeatVisual(a: NarrativeBeatVisual, b: NarrativeBeatVisual, t: number): NarrativeBeatVisual {
  const u = THREE.MathUtils.clamp(t, 0, 1)
  const cA = new THREE.Color(a.atmosphereColor)
  const cB = new THREE.Color(b.atmosphereColor)
  cA.lerp(cB, u)
  return {
    ...a,
    atmosphereColor: `#${cA.getHexString()}`,
    atmosphereThickness: THREE.MathUtils.lerp(a.atmosphereThickness, b.atmosphereThickness, u),
    waterCoverage: THREE.MathUtils.lerp(a.waterCoverage, b.waterCoverage, u),
    dustOpacity: THREE.MathUtils.lerp(a.dustOpacity, b.dustOpacity, u),
    volcanicGlow: THREE.MathUtils.lerp(a.volcanicGlow, b.volcanicGlow, u),
  }
}
