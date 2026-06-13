import { Body, Illumination, MakeTime } from 'astronomy-engine'

export type MoonIllumination = {
  phaseFraction: number
  phaseAngleDeg: number
  magnitude: number
}

export function computeMoonIllumination(at: Date): MoonIllumination {
  const info = Illumination(Body.Moon, MakeTime(at))
  return {
    phaseFraction: Math.max(0, Math.min(1, info.phase_fraction)),
    phaseAngleDeg: info.phase_angle,
    magnitude: info.mag,
  }
}

/** Giảm độ sáng sao/Dải Ngân Hà khi mây che (0–100%). */
export function skyWeatherVisibility(cloudCoverPct: number): number {
  const cover = Math.max(0, Math.min(100, cloudCoverPct))
  return Math.max(0.35, 1 - (cover / 100) * 0.5)
}

export type CelestialDiskMode = 'sun' | 'moon' | 'twilight'

/**
 * Ban ngày chỉ Mặt Trời, ban đêm chỉ Mặt Trăng — không chồng hai đĩa.
 * Hoàng hôn/bình minh (Mặt Trời −6°…0°): không vẽ đĩa (chỉ atmosphere).
 */
export function resolveCelestialDiskMode(sunAltDeg: number): CelestialDiskMode {
  if (sunAltDeg > 0) return 'sun'
  if (sunAltDeg < -6) return 'moon'
  return 'twilight'
}

export function shouldShowSunDisk(sunAltDeg: number): boolean {
  return resolveCelestialDiskMode(sunAltDeg) === 'sun'
}

export function shouldShowMoonDisk(sunAltDeg: number, moonAltDeg: number): boolean {
  return resolveCelestialDiskMode(sunAltDeg) === 'moon' && moonAltDeg > 1
}
