import type { NarrativeSite } from '@/features/content3d/narrative/types'

export function resolveValidStageIds(
  _entityId: string,
  site: Pick<NarrativeSite, 'id' | 'validStageIds' | 'visibleFromStageId'>,
  allStageIds: number[],
): number[] | undefined {
  if (site.validStageIds?.length) return site.validStageIds
  if (site.visibleFromStageId != null) {
    return allStageIds.filter((id) => id >= site.visibleFromStageId!)
  }
  return undefined
}

export function narrativeSiteVisibleOnStage(
  entityId: string,
  stageId: number,
  site: Pick<NarrativeSite, 'id' | 'validStageIds' | 'visibleFromStageId'>,
  allStageIds: number[],
): boolean {
  const allowed = resolveValidStageIds(entityId, site, allStageIds)
  if (allowed?.length) return allowed.includes(stageId)
  return true
}

export function narrativeSitesForBeat(
  entityId: string,
  stageId: number,
  sites: NarrativeSite[],
  allStageIds: number[],
): NarrativeSite[] {
  return sites.filter((s) => narrativeSiteVisibleOnStage(entityId, stageId, s, allStageIds))
}
