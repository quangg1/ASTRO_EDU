export type PassportStampKind = 'discovery' | 'dh_beat' | 'dh_site' | 'story' | 'sky'

export type PassportStamp = {
  kind: PassportStampKind
  id: string
  label: string
  subtitle?: string
  earnedAt?: string
  exploreHref?: string
}

export type ExplorePassportSummary = {
  stamps: PassportStamp[]
  counts: {
    discovery: number
    dh_beat: number
    dh_site: number
    story: number
    sky: number
    total: number
  }
  storyCatalogTotal: number
  discoveryCatalogHint: number
}

export type ExplorePassportApiPayload = {
  discoveries: string[]
  dhBeats: Array<{ entityId: string; beatId: string; at?: string }>
  dhSites: Array<{ entityId: string; siteId: string; at?: string }>
  storyTours: Array<{ storyId: string; at?: string }>
}
