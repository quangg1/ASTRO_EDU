/**
 * Pipeline tọa độ thiên văn qua astronomy-engine (MIT).
 * Julian time → LST/HA → Alt/Az; ephemeris hành tinh.
 */

import {
  Body,
  Equator,
  Horizon,
  MakeTime,
  Observer,
} from 'astronomy-engine'
import type { SkyObserver } from './skyObserver'

export type HorizontalCoords = { altDeg: number; azDeg: number; altRad: number; azRad: number }

function observerFromSky(obs: SkyObserver): Observer {
  return new Observer(obs.latDeg, obs.lonDeg, 0)
  
}

function timeFromSky(obs: SkyObserver) {
  return MakeTime(obs.at)
}

/** RA (deg), Dec (deg) → alt/az (deg, az từ Bắc qua Đông). */
export function equatorialToHorizontalAe(
  raDeg: number,
  decDeg: number,
  obs: SkyObserver,
): HorizontalCoords {
  const observer = observerFromSky(obs)
  const time = timeFromSky(obs)
  const raHours = raDeg / 15
  const h = Horizon(time, observer, raHours, decDeg, 'normal')
  const altDeg = h.altitude
  const azDeg = h.azimuth
  return {
    altDeg,
    azDeg,
    altRad: (altDeg * Math.PI) / 180,
    azRad: (azDeg * Math.PI) / 180,
  }
}

export type SunSkyState = {
  altDeg: number
  azDeg: number
  /** 0 = đêm, 1 = ban ngày (đơn giản hóa cho atmosphere). */
  dayFactor: number
}

export function computeSunSkyState(obs: SkyObserver): SunSkyState {
  const observer = observerFromSky(obs)
  const time = timeFromSky(obs)
  const eq = Equator(Body.Sun, time, observer, true, true)
  const hor = Horizon(time, observer, eq.ra, eq.dec, 'normal')
  const alt = hor.altitude
  const dayFactor = Math.max(0, Math.min(1, (alt + 6) / 12))
  return { altDeg: alt, azDeg: hor.azimuth, dayFactor }
}

/** 1 = đêm, 0 = ban ngày — fade sao, Dải Ngân Hà, landscape. */
export function nightSkyVisibility(sun: SunSkyState): number {
  const alt = sun.altDeg
  if (alt <= -6) return 1
  if (alt >= 6) return 0
  return 1 - (alt + 6) / 12
}

const BODY_MAP: Record<string, Body> = {
  'planet-sun': Body.Sun,
  'planet-moon': Body.Moon,
  'planet-mercury': Body.Mercury,
  'planet-venus': Body.Venus,
  'planet-mars': Body.Mars,
  'planet-jupiter': Body.Jupiter,
  'planet-saturn': Body.Saturn,
  'planet-uranus': Body.Uranus,
  'planet-neptune': Body.Neptune,
}

export type EphemerisEntry = {
  id: string
  label: string
  raDeg: number
  decDeg: number
}

export function computeEphemerisFromAstronomy(at: Date): EphemerisEntry[] {
  const obs: SkyObserver = {
    latDeg: 0,
    lonDeg: 0,
    at,
    lightPollution: 'dark',
    magLimit: 6.5,
  }
  const observer = observerFromSky(obs)
  const time = MakeTime(at)

  return Object.entries(BODY_MAP).map(([id, body]) => {
    const eq = Equator(body, time, observer, true, true)
    return {
      id,
      label: id.replace('planet-', '').replace(/^./, (c) => c.toUpperCase()),
      raDeg: eq.ra * 15,
      decDeg: eq.dec,
    }
  })
}
