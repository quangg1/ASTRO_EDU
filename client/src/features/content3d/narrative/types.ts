import type { EarthStage } from '@/features/content3d/narrative/earthHistoryTypes'

export type NarrativeSequenceType = 'geologic_ma' | 'mission_sols' | 'chapters' | 'custom_epochs'

export interface WorldConfig {
  bodySlug: string
  atmospherePreset?: string
  colorGrade?: string
  effectTags?: string[]
  lightingPreset?: string
}

export interface SequenceConfig {
  type: NarrativeSequenceType
  unit: string
  range?: [number, number]
  direction?: 'forward' | 'reverse'
}

export interface NarrativeBeat extends EarthStage {
  ref?: string | number
  worldOverride?: Partial<WorldConfig>
  lessonLinks?: Array<{ courseSlug?: string; lessonSlug?: string }>
}

export interface NarrativeSpace {
  id: string
  slug: string
  version: string
  title: Record<string, string>
  templateId: string
  world: WorldConfig
  sequence: SequenceConfig
  beats: NarrativeBeat[]
  assetBundle?: {
    refs?: Array<{ id: string; kind: string; label?: string }>
  }
  meta?: {
    verified?: boolean
    sourceRefs?: Array<{ label: string; url?: string }>
  }
}
