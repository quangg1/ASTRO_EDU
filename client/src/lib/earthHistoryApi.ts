import type { EarthStage, MajorEvent, Lifeform, LifeInfo, ClimateInfo, ContinentalInfo } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/** Raw stage từ server (Mongoose document) */
interface ServerStage {
  stageId: number
  name: string
  nameEn?: string
  icon?: string
  time: number
  timeEnd?: number | null
  timeDisplay?: string
  timeDisplayEn?: string
  eon: string
  era?: string | null
  period?: string | null
  epoch?: string | null
  atmosphere?: {
    o2?: number
    co2?: number
    n2?: number
    pressure?: number
  }
  astronomy?: {
    dayLength?: number
    moonDistance?: number
    yearLength?: number
    solarLuminosity?: number
  }
  climate?: {
    globalTemp?: number | null
    seaLevel?: number | null
    tempAnomaly?: number | null
    iceCoverage?: number | null
    oceanTemp?: number | null
  }
  continental?: {
    config?: string
    oceanCoverage?: number
    landArea?: number
  }
  life?: {
    exists?: boolean
    complexity?: string
    dominantLifeforms?: Lifeform[]
    biodiversityIndex?: number | null
    landLife?: boolean
    aerialLife?: boolean
    oxygenProducers?: boolean
  }
  majorEvents?: MajorEvent[]
  visual?: {
    earthColor?: string
    atmosphereColor?: string
    textureUrl?: string
  }
  flags?: {
    hasDebris?: boolean
    hasMeteorites?: boolean
    hasMoon?: boolean
    isExtinction?: boolean
    isCollision?: boolean
    isAsteroidImpact?: boolean
  }
  description?: { vi?: string; en?: string }
  resources?: { wikipediaUrl?: string; videoUrl?: string; references?: string[] }
  order?: number
}

function mapServerStageToClient(doc: ServerStage): EarthStage {
  const atm = doc.atmosphere
  const ast = doc.astronomy
  const vis = doc.visual
  const fl = doc.flags
  const desc = doc.description?.vi ?? doc.description?.en ?? ''
  const timeDisplay = doc.timeDisplay ?? (doc.time >= 1000
    ? `${(doc.time / 1000).toFixed(1)} tỷ năm trước`
    : doc.time >= 1
      ? `${Math.round(doc.time)} triệu năm trước`
      : 'Hiện tại')

  const maxMa = doc.time
  const minMa = doc.timeEnd != null ? doc.timeEnd : (doc.time >= 1 ? Math.max(0, doc.time - 50) : Math.max(0, doc.time - 0.5))

  return {
    id: doc.stageId,
    name: doc.name,
    time: doc.time,
    timeDisplay,
    maxMa,
    minMa,
    eon: doc.eon,
    era: doc.era ?? null,
    period: doc.period ?? null,
    epoch: doc.epoch ?? null,
    o2: atm?.o2 ?? 21,
    co2: atm?.co2 ?? 420,
    dayLength: ast?.dayLength ?? 24,
    moonDistance: ast?.moonDistance ?? undefined,
    earthColor: vis?.earthColor ?? '#6B93D6',
    atmosphereColor: vis?.atmosphereColor,
    textureUrl: vis?.textureUrl,
    hasDebris: fl?.hasDebris,
    hasMeteorites: fl?.hasMeteorites,
    hasMoon: fl?.hasMoon,
    isExtinction: fl?.isExtinction,
    description: desc,
    icon: doc.icon ?? '🌍',
    majorEvents: Array.isArray(doc.majorEvents) && doc.majorEvents.length > 0
      ? doc.majorEvents
      : undefined,
    life: doc.life as LifeInfo | undefined,
    climate: doc.climate as ClimateInfo | undefined,
    continental: doc.continental as ContinentalInfo | undefined,
    resources: doc.resources,
  }
}

/**
 * Lấy tất cả Earth History stages từ API.
 * Trả về [] nếu lỗi hoặc API không có dữ liệu.
 */
export async function fetchEarthHistoryStages(): Promise<EarthStage[]> {
  try {
    const res = await fetch(`${API_BASE}/earth-history`)
    const json = await res.json()
    if (!json.success || !Array.isArray(json.data)) return []
    return json.data.map((doc: ServerStage) => mapServerStageToClient(doc))
  } catch {
    return []
  }
}
