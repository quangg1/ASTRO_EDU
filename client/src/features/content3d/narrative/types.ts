/**
 * Schema thống nhất cho Deep History — Studio, API planet-narratives, runtime adapters.
 * Mars & Earth (và planet-* generic) dùng cùng cấu trúc; UI planet đọc qua adapter.
 */

export type NarrativeConfidence = 'consensus' | 'model' | 'hypothesis'
export type NarrativeLiquidWater = 'none' | 'rare' | 'regional' | 'widespread' | 'unknown'
export type NarrativeVolcanism = 'low' | 'moderate' | 'high' | 'dominant'
export type NarrativePressureBasis = 'measured_global_average' | 'model_range' | 'hypothesis_range'

export type NarrativeEventTone = 'info' | 'highlight' | 'warning'

export interface NarrativeMajorEvent {
  title: string
  summary: string
  tone?: NarrativeEventTone
  /** Earth taxonomy (volcanic, impact, …) — tuỳ chọn */
  type?: string
}

/** Shader / globe — 1 albedo + uniforms (Mars) hoặc tint + texture (Earth). */
export interface NarrativeBeatVisual {
  globeTint: string
  atmosphereColor: string
  atmosphereThickness: number
  waterCoverage: number
  dustOpacity: number
  volcanicGlow: number
  textureUrl?: string
  cloudTextureUrl?: string
}

/** Copy hiển thị panel phải / dock. */
export interface NarrativeBeatPanel {
  descriptionVi: string
  compareNoteVi: string
  environmentNoteVi: string
  pressureCitationVi: string
  surfaceTempNoteVi: string
}

/** Badge & số liệu môi trường (panel + một phần 3D). */
export interface NarrativeBeatEnvironment {
  confidence: NarrativeConfidence
  liquidWater: NarrativeLiquidWater
  volcanism: NarrativeVolcanism
  surfaceTempMinC: number
  surfaceTempMaxC: number
  surfacePressureRepresentativePa: number
  surfacePressureLowPa?: number
  surfacePressureHighPa?: number
  surfacePressureBasis: NarrativePressureBasis
  dustActivity?: 0 | 1 | 2 | 3
  o2Percent?: number
  co2Ppm?: number
  dayLengthHours?: number
  eon?: string
  era?: string | null
  period?: string | null
  epoch?: string | null
}

export interface NarrativeBeatFlags {
  hasDebris?: boolean
  hasMeteorites?: boolean
  hasMoon?: boolean
  isExtinction?: boolean
  isCollision?: boolean
  isAsteroidImpact?: boolean
}

export interface NarrativeBeat {
  id: number
  order: number
  name: string
  nameEn: string
  ageLabelVi: string
  icon: string
  accentColor: string
  /** Tuổi địa chất (Ma) — điểm đại diện / max */
  timeMa: number
  timeMaEnd?: number
  panel: NarrativeBeatPanel
  visual: NarrativeBeatVisual
  environment: NarrativeBeatEnvironment
  flags: NarrativeBeatFlags
  majorEvents: NarrativeMajorEvent[]
  resources?: { wikipediaUrl?: string; videoUrl?: string }
}

export interface NarrativeSite {
  id: string
  nameVi: string
  nameEn: string
  kind: string
  lat: number
  lng: number
  blurbVi: string
  coverImageUrl: string
  /** Stage được phép hiển thị pin — rỗng = mọi stage (hoặc preset legacy). */
  validStageIds?: number[]
  coverImageType?: 'orbital_modern' | 'surface_modern' | 'artistic'
  /** @deprecated Dùng validStageIds — giữ để đọc DB cũ. */
  visibleFromStageId?: number
}

import type { NarrativePanelSchema } from '@/features/content3d/narrative/panel-schema/types'

export interface PlanetNarrativeBundle {
  entityId: string
  kind: 'mars' | 'earth' | 'generic'
  beats: NarrativeBeat[]
  sites: NarrativeSite[]
  /** Layout & nhãn form/panel — tuỳ entity. */
  panelSchema?: NarrativePanelSchema
  published?: boolean
  /** Learning Path lesson ids — CMS bridge (không lưu progress ở đây). */
  linkedLessonIds?: string[]
  linkedConceptIds?: string[]
}

export const EARTH_SEA_LEVEL_PRESSURE_PA = 101_325 as const
