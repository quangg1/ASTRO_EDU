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

/** Thời điểm quan sát mặc định khi không có `?time=` — giờ thực trên máy người dùng. */
export function defaultSkyObserverTime(): Date {
  return new Date()
}

/**
 * Parse `?time=` — query string đổi `+07:00` thành khoảng trắng (`…00 07:00`).
 * Chuẩn hóa trước khi `new Date()` để URL `time=2026-06-02T07:00:00+07:00` hoạt động.
 */
/** Chuỗi `?time=` sau khi URLSearchParams decode — `+07:00` thường thành khoảng trắng. */
export function normalizeObserverTimeParamString(timeRaw: string): string {
  let s = String(timeRaw).trim()
  if (!s) return s
  try {
    s = decodeURIComponent(s)
  } catch {
    /* giữ nguyên */
  }
  s = s.replace(/%2B/gi, '+')
  if (/T\d{2}:\d{2}(:\d{2}(?:\.\d+)?)? \d{2}:\d{2}$/.test(s)) {
    s = s.replace(/ (\d{2}:\d{2})$/, '+$1')
  }
  return s
}

export function parseObserverTimeParam(timeRaw: string | null | undefined): Date | null {
  const raw = String(timeRaw ?? '').trim()
  if (!raw) return null

  const s = normalizeObserverTimeParamString(raw)
  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) return parsed

  return null
}

/** `?time=` có nghĩa người dùng / sự kiện lịch ghim thời điểm — không tick live. */
export function isObserverTimePinned(
  params: URLSearchParams | { get: (k: string) => string | null },
): boolean {
  return parseObserverTimeParam(params.get('time')) != null
}

/** Ghi `?time=` an toàn — ISO UTC, không dùng `+` offset (tránh query đổi `+` → space). */
export function formatObserverTimeParam(at: Date): string {
  return at.toISOString()
}

/** Preset thời gian quan sát trên La bàn chòm sao. */
export type SkyTimePreset = 'live' | 'morning' | 'afternoon' | 'evening'

const SKY_TIME_PRESET_HOURS: Record<Exclude<SkyTimePreset, 'live'>, number> = {
  morning: 6,
  afternoon: 14,
  evening: 21,
}

/** Giờ địa phương cho preset sáng / chiều / tối. */
export function skyTimeForPreset(
  preset: Exclude<SkyTimePreset, 'live'>,
  now = new Date(),
): Date {
  const d = new Date(now)
  d.setSeconds(0, 0)
  if (preset === 'evening' && d.getHours() < 5) d.setDate(d.getDate() - 1)
  d.setHours(SKY_TIME_PRESET_HOURS[preset], 0, 0, 0)
  return d
}

/** @deprecated Dùng `skyTimeForPreset('evening')`. */
export function tonightSkyObserverTime(now = new Date()): Date {
  return skyTimeForPreset('evening', now)
}

/** Preset đang active từ `?time=` — dùng highlight segment UI. */
export function resolveSkyTimePreset(
  params: URLSearchParams | { get: (k: string) => string | null },
): SkyTimePreset {
  if (!isObserverTimePinned(params)) return 'live'
  const at = parseObserverTimeParam(params.get('time'))
  if (!at) return 'live'

  const mins = at.getHours() * 60 + at.getMinutes()
  for (const preset of ['morning', 'afternoon', 'evening'] as const) {
    const target = SKY_TIME_PRESET_HOURS[preset] * 60
    if (Math.abs(mins - target) <= 60) return preset
  }

  const h = at.getHours()
  if (h >= 5 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'afternoon'
  return 'evening'
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
  const parsedAt = parseObserverTimeParam(timeRaw)
  if (parsedAt) at = parsedAt

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
