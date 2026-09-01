import {
  loadDiscoveryMap,
  NASA_SHOWCASE_ITEMS,
  NASA_SHOWCASE_STORIES,
} from '@/features/content3d/showcase/public'
import { buildExploreHref } from '@/features/explore/lib/exploreViewUrl'
import { getSkyTargetLabel, isConstellationTargetId, isSkyOnlyTarget } from '@/features/explore/lib/exploreTargets'
import { SKY_EXPLORE_SEED } from '@/features/explore/data/skyExploreSeed'
import { resolvePassportEntityLabel } from '@/features/explore/lib/explorePassportDisplay'
import type {
  ExplorePassportApiPayload,
  ExplorePassportSummary,
  PassportStamp,
} from './explorePassportTypes'
import { loadPassportSkyTargetIds, loadPassportStoryTourIds, migrateSkyStampsFromDiscoveryMap } from './explorePassportStorage'

function entityLabel(entityId: string): string {
  return resolvePassportEntityLabel(entityId)
}

function mergeDiscoveryIds(local: Record<string, boolean>, server: string[]): Set<string> {
  const set = new Set(server)
  for (const [id, v] of Object.entries(local)) {
    if (v) set.add(id)
  }
  return set
}

export function buildExplorePassportSummary(args: {
  userId?: string | null
  server: ExplorePassportApiPayload | null
}): ExplorePassportSummary {
  const { userId, server } = args
  migrateSkyStampsFromDiscoveryMap(userId ?? null)
  const localDiscovery = loadDiscoveryMap(userId ?? null)
  const localStories = loadPassportStoryTourIds(userId ?? null)
  const localSky = loadPassportSkyTargetIds(userId ?? null)

  const discoveryIds = mergeDiscoveryIds(localDiscovery, server?.discoveries ?? [])
  const storyIds = new Set<string>([
    ...(server?.storyTours ?? []).map((s) => s.storyId),
    ...localStories,
  ])

  const skyIds = new Set<string>([...localSky])
  const solarDiscoveryIds = new Set<string>()
  for (const entityId of discoveryIds) {
    if (isSkyOnlyTarget(entityId)) skyIds.add(entityId)
    else solarDiscoveryIds.add(entityId)
  }

  const stamps: PassportStamp[] = []

  for (const entityId of [...solarDiscoveryIds].sort()) {
    stamps.push({
      kind: 'discovery',
      id: `discovery:${entityId}`,
      label: entityLabel(entityId),
      subtitle: 'Khám phá 3D',
      exploreHref: buildExploreHref({ view: 'solar', entityId }),
    })
  }

  for (const row of server?.dhBeats ?? []) {
    stamps.push({
      kind: 'dh_beat',
      id: `dh_beat:${row.entityId}:${row.beatId}`,
      label: `${entityLabel(row.entityId)} · beat`,
      subtitle: row.beatId,
      earnedAt: row.at,
      exploreHref: buildExploreHref({
        view: 'solar',
        entityId: row.entityId,
        history: true,
      }),
    })
  }

  for (const row of server?.dhSites ?? []) {
    stamps.push({
      kind: 'dh_site',
      id: `dh_site:${row.entityId}:${row.siteId}`,
      label: `${entityLabel(row.entityId)} · site`,
      subtitle: row.siteId,
      earnedAt: row.at,
      exploreHref: buildExploreHref({
        view: 'solar',
        entityId: row.entityId,
        history: true,
      }),
    })
  }

  for (const storyId of [...storyIds].sort()) {
    const story = NASA_SHOWCASE_STORIES.find((s) => s.id === storyId)
    stamps.push({
      kind: 'story',
      id: `story:${storyId}`,
      label: story?.title || storyId,
      subtitle: story?.subtitle || 'Story tour',
      exploreHref: story?.unlockEntityId
        ? buildExploreHref({ view: 'solar', entityId: story.unlockEntityId })
        : undefined,
    })
  }

  for (const targetId of [...skyIds].sort()) {
    const seedRow = SKY_EXPLORE_SEED.find((t) => t.id === targetId)
    stamps.push({
      kind: 'sky',
      id: `sky:${targetId}`,
      label: seedRow?.nameVi || entityLabel(targetId) || getSkyTargetLabel(seedRow ?? null, targetId),
      subtitle: isConstellationTargetId(targetId) ? 'Chòm sao' : 'Bầu trời',
      exploreHref: buildExploreHref({ view: 'sky', targetId }),
    })
  }

  const counts = {
    discovery: stamps.filter((s) => s.kind === 'discovery').length,
    dh_beat: stamps.filter((s) => s.kind === 'dh_beat').length,
    dh_site: stamps.filter((s) => s.kind === 'dh_site').length,
    story: stamps.filter((s) => s.kind === 'story').length,
    sky: stamps.filter((s) => s.kind === 'sky').length,
    total: stamps.length,
  }

  return {
    stamps,
    counts,
    storyCatalogTotal: NASA_SHOWCASE_STORIES.length,
    discoveryCatalogHint: NASA_SHOWCASE_ITEMS.length,
  }
}
