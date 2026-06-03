/** Catalog sao sáng (J2000) — mở rộng dần hoặc thay bằng `public/sky/data/hip-bright.json`. */

import { BRIGHT_STARS, type BrightStar } from './brightStars'

export type CatalogStar = BrightStar & { bv?: number; spect?: string; label?: boolean }

/** Sao nền mag ≤ ~4.5 (tĩnh trong repo; bổ sung file JSON cho đầy đủ). */
export const STAR_CATALOG: CatalogStar[] = [
  ...BRIGHT_STARS.map((s) => ({ ...s, label: false })),
  { id: 'mimosa', name: 'Mimosa', raDeg: 191.93, decDeg: -59.69, mag: 1.25, label: false },
  { id: 'gacrux', name: 'Gacrux', raDeg: 187.79, decDeg: -57.11, mag: 1.59, label: false },
  { id: 'shaula', name: 'Shaula', raDeg: 263.4, decDeg: -37.1, mag: 1.62, label: false },
  { id: 'bellatrix', name: 'Bellatrix', raDeg: 81.28, decDeg: 6.35, mag: 1.64, label: false },
  { id: 'elnath', name: 'Elnath', raDeg: 81.57, decDeg: 28.61, mag: 1.65, label: false },
  { id: 'miaplacidus', name: 'Miaplacidus', raDeg: 138.3, decDeg: -69.72, mag: 1.67, label: false },
  { id: 'alnilam', name: 'Alnilam', raDeg: 84.05, decDeg: -1.2, mag: 1.69, label: false },
  { id: 'alnair', name: 'Alnair', raDeg: 346.72, decDeg: -46.96, mag: 1.73, label: false },
  { id: 'alioth', name: 'Alioth', raDeg: 193.51, decDeg: 55.96, mag: 1.76, label: false },
  { id: 'mirfak', name: 'Mirfak', raDeg: 51.08, decDeg: 49.86, mag: 1.79, label: false },
  { id: 'dubhe', name: 'Dubhe', raDeg: 165.93, decDeg: 61.75, mag: 1.81, label: false },
  { id: 'alpheratz', name: 'Alpheratz', raDeg: 2.1, decDeg: 29.09, mag: 2.07, label: false },
  { id: 'castor', name: 'Castor', raDeg: 113.65, decDeg: 31.89, mag: 1.58, label: false },
  { id: 'polaris', name: 'Polaris', raDeg: 37.95, decDeg: 89.26, mag: 1.98, label: false },
]

/** Sao nền thêm (không nhãn) — mag 3–5, phân bố thật hơn random. */
const EXTRA_BACKGROUND: CatalogStar[] = [
  { id: 'bg-1', name: '', raDeg: 12, decDeg: 45, mag: 4.2 },
  { id: 'bg-2', name: '', raDeg: 45, decDeg: -20, mag: 4.5 },
  { id: 'bg-3', name: '', raDeg: 120, decDeg: 30, mag: 3.8 },
  { id: 'bg-4', name: '', raDeg: 200, decDeg: -15, mag: 4.0 },
  { id: 'bg-5', name: '', raDeg: 280, decDeg: 20, mag: 3.5 },
  { id: 'bg-6', name: '', raDeg: 330, decDeg: -40, mag: 4.3 },
]

export const ALL_STARS: CatalogStar[] = [...STAR_CATALOG, ...EXTRA_BACKGROUND]

export function bvToRgb(bv = 0.6): string {
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))
  let r = 0
  let g = 0
  let b = 0
  if (t <= 6600) {
    r = 1
    g = Math.min(1, Math.max(0, (t - 2000) / 4600))
  } else {
    r = Math.min(1, Math.max(0, 1.292 - (t - 6000) * 0.00012))
    g = Math.min(1, Math.max(0, 0.39 + (t - 6000) * 0.00008))
  }
  b = t < 7500 ? Math.min(1, Math.max(0, (t - 2000) / 11000)) : 1
  const m = 255
  return `rgb(${Math.round(r * m)},${Math.round(g * m)},${Math.round(b * m)})`
}
