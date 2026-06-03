/** Ephemeris Mặt Trời / Trăng / hành tinh — astronomy-engine (MIT). */

import { computeEphemerisFromAstronomy } from './skyAstronomy'
import type { SkyObserver } from './skyObserver'

export type SkyEphemerisBody = {
  id: string
  label: string
  raDeg: number
  decDeg: number
}

const BODY_LABELS: Record<string, string> = {
  'planet-sun': 'Sun',
  'planet-moon': 'Moon',
  'planet-mercury': 'Mercury',
  'planet-venus': 'Venus',
  'planet-mars': 'Mars',
  'planet-jupiter': 'Jupiter',
  'planet-saturn': 'Saturn',
  'planet-uranus': 'Uranus',
  'planet-neptune': 'Neptune',
}

export function computeSkyEphemerisBodies(at: Date): SkyEphemerisBody[] {
  return computeEphemerisFromAstronomy(at).map((b) => ({
    ...b,
    label: BODY_LABELS[b.id] ?? b.label,
  }))
}

export function findEphemerisBody(
  bodies: SkyEphemerisBody[],
  targetId: string,
): SkyEphemerisBody | undefined {
  return bodies.find((b) => b.id === targetId)
}

export function observerTimeLabel(obs: SkyObserver): { time: string; date: string } {
  return {
    time: obs.at.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    date: obs.at.toLocaleDateString('vi-VN'),
  }
}
