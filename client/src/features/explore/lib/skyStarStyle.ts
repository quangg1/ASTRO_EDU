/** Magnitude, màu B–V (desaturated), extinction, scintillation. */

import { bvToRgb } from '@/features/explore/data/starCatalog'

/** Tông thực tế — trắng/xanh nhạt/vàng nhạt/cam/đỏ trần, không xanh lá gắt. */
const SPECTRAL_HEX: Record<string, string> = {
  O: '#c8d4f0',
  B: '#d0daf5',
  A: '#e8ecf8',
  F: '#f5f6fa',
  G: '#f8f4ee',
  K: '#f0e0c8',
  M: '#e8c8a8',
}

export type SkyLightPollution = 'dark' | 'suburban' | 'urban'

export const MAG_LIMIT_BY_POLLUTION: Record<SkyLightPollution, number> = {
  dark: 6.5,
  suburban: 5.0,
  urban: 3.0,
}

export const STAR_POINT_CLOUD_MAG_FLOOR = -1.5

export function parseSkyLightPollution(
  raw: string | null | undefined,
): SkyLightPollution {
  const v = (raw ?? '').toLowerCase()
  if (v === 'urban' || v === 'city' || v === '3') return 'urban'
  if (v === 'suburban' || v === '5') return 'suburban'
  return 'dark'
}

export function magLimitForPollution(p: SkyLightPollution): number {
  return MAG_LIMIT_BY_POLLUTION[p]
}

export function spectralTypeToHex(spect?: string | null): string {
  if (!spect || typeof spect !== 'string') return SPECTRAL_HEX.G
  const letter = spect.trim().charAt(0).toUpperCase()
  return SPECTRAL_HEX[letter] ?? SPECTRAL_HEX.G
}

/**
 * Giảm bão hòa nhẹ — giữ độ sáng (desaturate không được làm sao biến mất).
 * mix ~0.55: vẫn nhạt như mắt thường, không xám như mix 0.38.
 */
export function desaturateStarRgb(
  r: number,
  g: number,
  b: number,
  mix = 0.55,
): [number, number, number] {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  let r2 = lum + (r - lum) * mix
  let g2 = lum + (g - lum) * mix
  let b2 = lum + (b - lum) * mix
  if (g2 > r2 + 0.05 && g2 > b2 + 0.05) {
    const avg = (r2 + b2) * 0.5
    g2 = avg * 0.95
  }
  const peak = Math.max(r2, g2, b2, 0.001)
  const lift = Math.min(1.12, 0.92 / peak)
  const clamp = (x: number) => Math.min(1, Math.max(0, x))
  return [clamp(r2 * lift), clamp(g2 * lift), clamp(b2 * lift)]
}

export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ]
  }
  return [0.95, 0.94, 0.92]
}

export function starColorRgb(bv?: number, spect?: string): [number, number, number] {
  const hex =
    bv != null && Number.isFinite(bv) ? bvToRgb(bv) : spectralTypeToHex(spect)
  const [r, g, b] = hex.startsWith('rgb')
    ? parseRgbString(hex)
    : hexToRgb01(hex)
  return desaturateStarRgb(r, g, b)
}

function parseRgbString(s: string): [number, number, number] {
  const m = s.match(/[\d.]+/g)
  if (!m || m.length < 3) return [0.95, 0.94, 0.92]
  return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255]
}

export function starRelativeFlux(mag: number, magLimit: number): number {
  if (mag > magLimit || mag < STAR_POINT_CLOUD_MAG_FLOOR) return 0
  return Math.pow(2.512, -(mag - magLimit))
}

export function includeInStarPointCloud(
  mag: number,
  magLimit: number,
  name?: string,
): boolean {
  if (name === 'Sol' || name === 'Sun') return false
  return mag >= STAR_POINT_CLOUD_MAG_FLOOR && mag <= magLimit
}

/** Log-scale: mag 0 → 4.0, mag 4 → 1.0, mag 6 → 0.5. */
export function starPointCanvasSize(mag: number, magLimit: number): number {
  if (mag > magLimit || mag < STAR_POINT_CLOUD_MAG_FLOOR) return 0
  const logInterp = (m: number, mLo: number, sLo: number, mHi: number, sHi: number) => {
    if (m <= mLo) return sLo
    if (m >= mHi) return sHi
    const t = (m - mLo) / (mHi - mLo)
    return sLo * Math.pow(sHi / sLo, t)
  }
  if (mag <= 0) return 4.0
  if (mag <= 4) return logInterp(mag, 0, 4.0, 4, 1.0)
  if (mag <= 6) return logInterp(mag, 4, 1.0, 6, 0.5)
  return logInterp(mag, 6, 0.5, magLimit, 0.32)
}

export function starGlowFactor(mag: number, magLimit: number): number {
  if (mag > magLimit - 0.5) return 0
  if (mag <= 0) return 1
  if (mag <= 1.5) return 0.92
  if (mag <= 3) return 0.55 - (mag - 1.5) * 0.2
  if (mag <= 4.5) return 0.2 - (mag - 3) * 0.12
  return 0
}

export function starBaseOpacityFromMag(mag: number, magLimit: number): number {
  const flux = starRelativeFlux(mag, magLimit)
  if (flux <= 0) return 0
  const base = 0.38 + Math.sqrt(flux) * 0.62
  if (mag >= 5.5) return Math.min(1, base * 0.88)
  if (mag >= 4) return Math.min(1, base * 0.94)
  return Math.min(1, base)
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Khí quyển: alt < 10° mờ mạnh + đỏ/cam (Saturn mọc chân trời). */
export function atmosphericExtinction(altDeg: number): {
  opacity: number
  redness: number
} {
  if (altDeg <= -90) return { opacity: 0, redness: 0 }
  if (altDeg <= 0) {
    const t = Math.max(0, 1 + altDeg / 90)
    return {
      opacity: 0.48 + 0.22 * t,
      redness: 0.16 + 0.12 * (1 - t),
    }
  }
  const altRad = (altDeg * Math.PI) / 180
  const airMass = 1 / Math.max(0.04, Math.sin(altRad))
  const lowBand = smoothstep(10, 0, altDeg)
  const midBand = smoothstep(25, 10, altDeg)
  const kMass = Math.min(1, (airMass - 1) * 0.42)
  const k = Math.min(1, kMass * (0.35 + 0.65 * (1 - midBand)) + lowBand * 0.55)
  return {
    opacity: Math.max(0.06, 1 - k * 0.92),
    redness: Math.min(0.82, k * 0.72 + lowBand * 0.28),
  }
}

export function applyHorizonReddening(
  r: number,
  g: number,
  b: number,
  redness: number,
): [number, number, number] {
  const t = redness
  return [
    Math.min(1, r + t * 0.18),
    g * (1 - t * 0.28),
    b * (1 - t * 0.38),
  ]
}

export function starTwinklePhase(seed: string | number): number {
  let h = 0
  const s = String(seed)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return ((h & 0xffff) / 0xffff) * Math.PI * 2
}
