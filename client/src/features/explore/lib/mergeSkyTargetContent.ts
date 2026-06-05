import type { ShowcasePanelConfigDTO } from '@/features/content3d/showcase/api/showcaseEntitiesApi'
import type { SkyExploreTarget } from './exploreTargets'

export type SkyTargetContentDTO = {
  targetId: string
  nameVi?: string
  museumBlurbVi?: string
  conceptHints?: string[]
  panelConfig?: ShowcasePanelConfigDTO
  published?: boolean
}

export function mergeSkyTargetContent(
  targets: SkyExploreTarget[],
  contentById: Record<string, SkyTargetContentDTO> | null | undefined,
): SkyExploreTarget[] {
  const map = contentById || {}
  if (!Object.keys(map).length) return targets
  return targets.map((t) => {
    const c = map[t.id]
    if (!c || c.published === false) return t
    return {
      ...t,
      nameVi: String(c.nameVi || '').trim() || t.nameVi,
      museumBlurbVi: String(c.museumBlurbVi || '').trim() || undefined,
      conceptHints: c.conceptHints?.length ? c.conceptHints : t.conceptHints,
      panelConfig: c.panelConfig ?? undefined,
    }
  })
}
