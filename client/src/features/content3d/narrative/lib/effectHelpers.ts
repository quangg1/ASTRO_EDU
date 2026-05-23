import type { NarrativeBeat } from '@/features/content3d/narrative/types'

/** Cường độ hiệu ứng bão bụi trên globe (0 = tắt). */
export function resolveDustEffectIntensity(beat: NarrativeBeat, dustDemoOn: boolean): number {
  return Math.min(3, Math.max(beat.environment.dustActivity ?? 0, dustDemoOn ? 2 : 0))
}

/** Vệt sáng kênh lũ / outflow — beat cụ thể hoặc demo. */
export function resolveFloodGlowVisible(beat: NarrativeBeat, floodDemoOn: boolean): boolean {
  return beat.flags?.hasDebris === true || beat.id === 5 || floodDemoOn
}
