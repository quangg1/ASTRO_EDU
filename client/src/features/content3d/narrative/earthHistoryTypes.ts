// Earth History domain types

export interface MajorEvent {
  name: string
  nameEn?: string
  description?: string
  type?: 'volcanic' | 'impact' | 'climate' | 'biological' | 'tectonic' | 'extinction' | 'evolution'
  magnitude?: number
}

export interface Lifeform {
  name: string
  nameEn?: string
  type?: string
  description?: string
  imageUrl?: string
  firstAppearance?: boolean
  dominant?: boolean
}

export interface ClimateInfo {
  globalTemp?: number | null
  seaLevel?: number | null
  tempAnomaly?: number | null
  iceCoverage?: number | null
  oceanTemp?: number | null
}

export interface ContinentalInfo {
  config?: string
  oceanCoverage?: number
  landArea?: number
}

export interface LifeInfo {
  exists?: boolean
  complexity?: string
  dominantLifeforms?: Lifeform[]
  biodiversityIndex?: number | null
  landLife?: boolean
  aerialLife?: boolean
  oxygenProducers?: boolean
}

export interface EarthStage {
  id: number
  name: string
  time: number
  timeDisplay: string
  maxMa?: number
  minMa?: number
  eon: string
  era: string | null
  period: string | null
  epoch?: string | null

  // Atmosphere (flat for UI)
  o2: number
  co2: number

  // Astronomy
  dayLength: number
  moonDistance?: number

  // Visual
  earthColor: string
  atmosphereColor?: string
  textureUrl?: string

  // Features (flags)
  hasDebris?: boolean
  hasMeteorites?: boolean
  isExtinction?: boolean
  hasMoon?: boolean

  description: string
  icon: string

  majorEvents?: MajorEvent[]
  life?: LifeInfo
  climate?: ClimateInfo
  continental?: ContinentalInfo
  resources?: { wikipediaUrl?: string; videoUrl?: string }
}

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
  geoplate?: number | null
  paleoRegionName?: string

  environment?: string
}

export interface FossilStats {
  total: number
  byPhylum: Record<string, number>
  byEra?: Record<string, number>
  byPeriod?: Array<{ _id: string; count: number; avgMa: number }>
}
