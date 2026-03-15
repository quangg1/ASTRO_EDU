// Major event (Earth History) – từ model EarthHistory
export interface MajorEvent {
  name: string
  nameEn?: string
  description?: string
  type?: 'volcanic' | 'impact' | 'climate' | 'biological' | 'tectonic' | 'extinction' | 'evolution'
  magnitude?: number
}

// Lifeform (sinh vật tiêu biểu từ server)
export interface Lifeform {
  name: string
  nameEn?: string
  type?: string
  description?: string
  imageUrl?: string
  firstAppearance?: boolean
  dominant?: boolean
}

// Climate (từ model)
export interface ClimateInfo {
  globalTemp?: number | null
  seaLevel?: number | null
  tempAnomaly?: number | null
  iceCoverage?: number | null
  oceanTemp?: number | null
}

// Continental config
export interface ContinentalInfo {
  config?: string
  oceanCoverage?: number
  landArea?: number
}

// Life summary (từ model)
export interface LifeInfo {
  exists?: boolean
  complexity?: string
  dominantLifeforms?: Lifeform[]
  biodiversityIndex?: number | null
  landLife?: boolean
  aerialLife?: boolean
  oxygenProducers?: boolean
}

// Earth History Stage (flat + nested từ API/static)
export interface EarthStage {
  id: number
  name: string
  time: number // Million years ago (MYA), dùng cho timeline / hiển thị
  timeDisplay: string
  /** Ranh giới kỷ (Ma) để query hóa thạch — khớp ICS/PBDB. Nếu có thì dùng thay cho time ± buffer. */
  maxMa?: number
  minMa?: number
  eon: string
  era: string | null
  period: string | null
  epoch?: string | null
  
  // Atmosphere (flat cho UI)
  o2: number // percentage
  co2: number // ppm
  
  // Astronomy
  dayLength: number // hours
  moonDistance?: number
  
  // Visual
  earthColor: string
  atmosphereColor?: string
  textureUrl?: string
  
  // Features (flat từ flags)
  hasDebris?: boolean
  hasMeteorites?: boolean
  isExtinction?: boolean
  hasMoon?: boolean
  
  // Description
  description: string
  icon: string
  
  // Nested từ API – hiển thị trong InfoPanel
  majorEvents?: MajorEvent[]
  life?: LifeInfo
  climate?: ClimateInfo
  continental?: ContinentalInfo
  resources?: { wikipediaUrl?: string; videoUrl?: string }
}

// Fossil data
export interface Fossil {
  _id: string
  name: string
  phylum: string
  class?: string
  order?: string
  family?: string
  genus?: string
  
  // Time
  maxMa: number
  minMa: number
  period?: string
  era?: string
  
  // Location
  lng: number
  lat: number
  paleolng?: number
  paleolat?: number
  /** GPlates plate ID (mảng kiến tạo) */
  geoplate?: number | null
  /** Tên vùng cổ địa lý theo thời kỳ (từ server) */
  paleoRegionName?: string

  // Environment
  environment?: string
}

// API Response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  count?: number
  total?: number
}

// Fossil Stats
export interface FossilStats {
  total: number
  byPhylum: Record<string, number>
  byEra?: Record<string, number>
  byPeriod?: Array<{ _id: string; count: number; avgMa: number }>
}
