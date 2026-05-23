/**
 * Nội dung mẫu — Studio nạp khi chưa có bản ghi DB.
 */
import { earthStagesToBundle, ensureBeatVisual } from '@/features/content3d/narrative/adapters'
import type { PlanetNarrativeBundle } from '@/features/content3d/narrative/types'
import { earthHistoryData } from '@/features/content3d/earth/lib/earthHistoryData'
import {
  buildLegacyBundleForEntity,
  hasLegacySeedEntity,
} from '@/features/content3d/narrative/presets/legacyEntitySeeds'
import { defaultPanelSchemaForEntity } from '@/features/content3d/narrative/panel-schema/defaultSchemas'

export function getLegacyPresetBundle(entityId: string): PlanetNarrativeBundle | null {
  const seeded = buildLegacyBundleForEntity(entityId)
  if (seeded) return seeded
  if (entityId === 'planet-earth') {
    return earthStagesToBundle(earthHistoryData, entityId)
  }
  return null
}

export function hasLegacyPreset(entityId: string): boolean {
  return hasLegacySeedEntity(entityId)
}

/** Bundle khởi tạo Studio: DB ưu tiên ở editor; đây là fallback hoặc trống. */
export function studioFallbackBundle(entityId: string): PlanetNarrativeBundle {
  const legacy = getLegacyPresetBundle(entityId)
  if (!legacy?.beats?.length) {
    return {
      entityId,
      kind: 'generic',
      beats: [],
      sites: [],
      panelSchema: defaultPanelSchemaForEntity(entityId),
      published: true,
    }
  }
  const beats = legacy.beats.map(ensureBeatVisual).sort((a, b) => a.order - b.order)
  return {
    ...legacy,
    entityId,
    kind: 'generic',
    beats,
    sites: legacy.sites ?? [],
    panelSchema: defaultPanelSchemaForEntity(entityId),
  }
}
