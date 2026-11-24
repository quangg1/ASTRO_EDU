import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'

/**
 * Thực thể giả để đo hiệu năng: mở `/explore?stress=2000`.
 * Quỹ đạo kiểu vành đai tiểu hành tinh (a = 1.8–5.2 AU) để không đổi thang khoảng cách của cảnh.
 */
export const STRESS_ID_PREFIX = 'stress-'

export function isStressEntityId(id: string | null | undefined): boolean {
  return String(id || '').startsWith(STRESS_ID_PREFIX)
}

/** Bộ sinh số ngẫu nhiên có seed để mỗi lần mở trang ra cùng một bộ thực thể. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeStressEntities(count: number, seed = 42): ShowcaseOrbitEntity[] {
  const n = Math.max(0, Math.min(20_000, Math.floor(count)))
  const rand = mulberry32(seed)
  const out: ShowcaseOrbitEntity[] = []
  for (let k = 0; k < n; k++) {
    const a = 1.8 + rand() * 3.4
    const periodDays = 365.25 * Math.pow(a, 1.5)
    const radiusKm = 1 + Math.pow(rand(), 3) * 450
    const hue = Math.floor(20 + rand() * 30)
    out.push({
      id: `${STRESS_ID_PREFIX}${k}`,
      name: `Stress ${k}`,
      orbitSource: 'jpl-horizons',
      semiMajorAxisAu: a,
      orbitalElements: {
        a,
        e: rand() * 0.25,
        i: rand() * 18,
        om: rand() * 360,
        w: rand() * 360,
        m: rand() * 360,
        periodDays,
      },
      radiusKm,
      distance: a,
      period: periodDays,
      periodDays,
      size: 0.05,
      color: `hsl(${hue}, 35%, 62%)`,
      orbitColor: '#555555',
    })
  }
  return out
}
