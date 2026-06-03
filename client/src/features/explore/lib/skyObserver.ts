/** Observer location & time — Alt/Az qua astronomy-engine. */

import { equatorialToHorizontalAe } from './skyAstronomy'
import {
  magLimitForPollution,
  parseSkyLightPollution,
  type SkyLightPollution,
} from './skyStarStyle'

export type { SkyLightPollution }

export type SkyObserver = {
  latDeg: number
  lonDeg: number
  at: Date
  /** `?pollution=dark|suburban|urban` — giới hạn cấp sao hiển thị. */
  lightPollution: SkyLightPollution
  /** Cấp sao tối đa (6.5 đêm tối, 3.0 thành phố). */
  magLimit: number
}

const DEFAULT_LAT = 10.8
const DEFAULT_LON = 106.66

/**
 * Thời điểm quan sát mặc định khi không có `?time=` — giống Stellarium “đêm đầy sao”.
 * 15/01 ~21:30 tại 10.8°N: ~4000+ sao mag≤6.5 trên chân trời (trải cả vòm).
 * Ngày hè (vd. 3/6) cùng giờ chỉ ~100 sao → dồn một góc, không giống Stellarium.
 */
export function defaultSkyObserverTime(now = new Date()): Date {
  return new Date(now.getFullYear(), 0, 15, 21, 30, 0)
}

export function parseSkyObserverFromSearchParams(
  params: URLSearchParams | { get: (k: string) => string | null },
): SkyObserver {
  const latRaw = params.get('lat')
  const lonRaw = params.get('lon')
  const timeRaw = params.get('time')

  let latDeg = DEFAULT_LAT
  let lonDeg = DEFAULT_LON
  if (latRaw != null && lonRaw != null) {
    const lat = Number(latRaw)
    const lon = Number(lonRaw)
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      latDeg = Math.max(-90, Math.min(90, lat))
      lonDeg = lon
    }
  }

  let at = defaultSkyObserverTime()
  if (timeRaw) {
    const parsed = new Date(timeRaw)
    if (!Number.isNaN(parsed.getTime())) at = parsed
  }

  const lightPollution = parseSkyLightPollution(
    params.get('pollution') ?? params.get('bortle'),
  )

  return {
    latDeg,
    lonDeg,
    at,
    lightPollution,
    magLimit: magLimitForPollution(lightPollution),
  }
}

export function formatObserverLocationShort(obs: SkyObserver): string {
  const lat = obs.latDeg
  const ns = lat >= 0 ? 'N' : 'S'
  const lon = obs.lonDeg
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(1)}°${ns} · ${Math.abs(lon).toFixed(1)}°${ew}`
}

export type HorizontalCoords = { altRad: number; azRad: number; altDeg: number; azDeg: number }

/** Equatorial RA/Dec (degrees) → altitude & azimuth (radians, az from north through east). */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  obs: SkyObserver,
): HorizontalCoords {
  return equatorialToHorizontalAe(raDeg, decDeg, obs)
}

/** Alt/az (rad) → scene unit vector: Y = zenith, X = east, Z = south (az=0 north → -Z). */
export function horizontalToUnitVector(altRad: number, azRad: number): [number, number, number] {
  const cosAlt = Math.cos(altRad)
  const x = cosAlt * Math.sin(azRad)
  const y = Math.sin(altRad)
  const z = -cosAlt * Math.cos(azRad)
  return [x, y, z]
}

/** Hướng trên celestial sphere — alt âm vẫn hợp lệ (all-sky / Stellarium). */
export function equatorialToSceneVector(
  raDeg: number,
  decDeg: number,
  obs: SkyObserver,
): [number, number, number] {
  const { altRad, azRad } = equatorialToHorizontal(raDeg, decDeg, obs)
  return horizontalToUnitVector(altRad, azRad)
}

export function isAboveHorizon(raDeg: number, decDeg: number, obs: SkyObserver): boolean {
  return equatorialToHorizontal(raDeg, decDeg, obs).altDeg > -0.5
}
