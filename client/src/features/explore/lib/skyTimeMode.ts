import type { SunSkyState } from './skyAstronomy'

/** Ngưỡng thiên văn (độ) — dưới 6° coi như hoàng hôn/bình minh (sao), trên 6° là ban ngày. */
export const SKY_TWILIGHT_SUN_ALT_DEG = 6

export type SkyTimeMode = 'night' | 'twilight' | 'day'

export function resolveSkyTimeMode(sun: SunSkyState): SkyTimeMode {
  if (sun.altDeg < -6) return 'night'
  if (sun.altDeg > SKY_TWILIGHT_SUN_ALT_DEG) return 'day'
  return 'twilight'
}

/** 0 = giữa trưa, 1 = đêm — fade mượt quanh ±6°. */
export function starFieldVisibility(sun: SunSkyState): number {
  const alt = sun.altDeg
  if (alt <= -6) return 1
  if (alt >= SKY_TWILIGHT_SUN_ALT_DEG) return 0
  return 1 - (alt + 6) / (SKY_TWILIGHT_SUN_ALT_DEG + 6)
}

/** Bầu trời sao world-space — Mặt Trời dưới 6° (kể cả 17:53 VN). */
export function useStarryWorldSky(sun: SunSkyState): boolean {
  return sun.altDeg < SKY_TWILIGHT_SUN_ALT_DEG
}

/** Mây + gradient ban ngày — chỉ khi Mặt Trời cao (> 6°). */
export function showScreenWeatherLayers(sun: SunSkyState): boolean {
  return sun.altDeg >= SKY_TWILIGHT_SUN_ALT_DEG
}

/** Đĩa Mặt Trời — chỉ giữa ngày, không lúc hoàng hôn. */
export function showScreenSunDisk(sun: SunSkyState): boolean {
  return sun.altDeg >= SKY_TWILIGHT_SUN_ALT_DEG
}

export function sunScreenNdc(altDeg: number, azDeg: number, aspect: number): { x: number; y: number } {
  if (altDeg <= 0) return { x: 2, y: 2 }
  const altRad = (altDeg * Math.PI) / 180
  const azRad = (azDeg * Math.PI) / 180
  const y = Math.sin(altRad) * 0.72 - 0.05
  const horiz = Math.cos(altRad)
  const x = Math.sin(azRad) * horiz * 0.68
  return { x: x / Math.max(aspect, 0.5), y }
}
