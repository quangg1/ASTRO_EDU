import { getStaticAssetUrl } from '@/lib/apiConfig'
import {
  getNasaCatalogItemById,
  getShowcaseOrbitEntityById,
  NASA_SHOWCASE_STORIES,
} from '@/features/content3d/showcase/public'
import { buildExploreHref } from '@/features/explore/lib/exploreViewUrl'
import { SKY_EXPLORE_SEED } from '@/features/explore/data/skyExploreSeed'
import { getSkyTargetLabel, isConstellationTargetId } from '@/features/explore/lib/exploreTargets'
import type { PassportStamp, PassportStampKind } from './explorePassportTypes'

const KIND_LABEL: Record<PassportStampKind, string> = {
  discovery: 'Khám phá 3D',
  dh_beat: 'Lịch sử sâu',
  dh_site: 'Site narrative',
  story: 'Story tour',
  sky: 'La bàn sao',
}

export function passportKindLabel(kind: PassportStampKind): string {
  return KIND_LABEL[kind]
}

/** Tên hiển thị thân thiện — tránh raw id kiểu `constellation-western-orion`. */
export function resolvePassportEntityLabel(entityId: string): string {
  const id = String(entityId || '').trim()
  if (!id) return 'Thiên thể'

  const catalog = getNasaCatalogItemById(id)
  if (catalog?.name) return catalog.name

  const orbit = getShowcaseOrbitEntityById(id)
  if (orbit?.name) return orbit.name

  const sky = SKY_EXPLORE_SEED.find((t) => t.id === id)
  if (sky) return getSkyTargetLabel(sky, id)

  if (isConstellationTargetId(id)) {
    const slug = id.replace(/^constellation-western-/, '').replace(/^constellation-/, '')
    const pretty = slug
      .split('-')
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
    return pretty ? `Chòm ${pretty}` : id
  }

  if (id.startsWith('planet-')) {
    const slug = id.slice('planet-'.length)
    return slug.charAt(0).toUpperCase() + slug.slice(1)
  }

  return id
}

export function formatPassportId(totalStamps: number, userId?: string | null): string {
  const tail = userId ? userId.replace(/\W/g, '').slice(-4).toUpperCase() : 'GUEST'
  return `${String(100 + totalStamps).padStart(3, '0')}-${tail || 'GAL'}`
}

export type PassportStampVisual = {
  gradient: string
  imageUrl?: string
  accent: string
}

export function resolvePassportStampVisual(stamp: PassportStamp): PassportStampVisual {
  if (stamp.kind === 'story') {
    return {
      gradient: 'linear-gradient(145deg, #1e1b4b 0%, #4c1d95 48%, #7c3aed 100%)',
      accent: '#c4b5fd',
    }
  }
  if (stamp.kind === 'sky') {
    return {
      gradient: 'linear-gradient(145deg, #0c1222 0%, #1e3a5f 55%, #312e81 100%)',
      accent: '#93c5fd',
    }
  }
  if (stamp.kind === 'dh_beat' || stamp.kind === 'dh_site') {
    return {
      gradient: 'linear-gradient(145deg, #1a1208 0%, #78350f 50%, #b45309 100%)',
      accent: '#fcd34d',
    }
  }

  const entityId = stamp.id.startsWith('discovery:') ? stamp.id.slice('discovery:'.length) : ''
  const cat = entityId ? getNasaCatalogItemById(entityId) : undefined
  const orbit = entityId ? getShowcaseOrbitEntityById(entityId) : undefined
  const texturePath = cat?.texturePath || orbit?.texturePath
  const imageUrl = texturePath ? getStaticAssetUrl(texturePath) : undefined
  const accent = orbit?.orbitColor || orbit?.color || '#67e8f9'
  const group = cat?.group

  let gradient = 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
  if (group === 'planets_moons') {
    gradient = 'linear-gradient(145deg, #0c1929 0%, #155e75 45%, #0369a1 100%)'
  } else if (group === 'spacecraft') {
    gradient = 'linear-gradient(145deg, #111827 0%, #374151 50%, #6b7280 100%)'
  } else if (group === 'comets') {
    gradient = 'linear-gradient(145deg, #1a1025 0%, #581c87 55%, #9333ea 100%)'
  } else if (isConstellationTargetId(entityId)) {
    gradient = 'linear-gradient(145deg, #050816 0%, #1e1b4b 40%, #4338ca 100%)'
  }

  return { gradient, imageUrl, accent }
}

export function listStoryVisaStamps(earnedStoryIds: Set<string>) {
  return NASA_SHOWCASE_STORIES.map((story) => ({
    id: story.id,
    title: story.title,
    subtitle: story.subtitle,
    earned: earnedStoryIds.has(story.id),
    exploreHref: story.unlockEntityId
      ? buildExploreHref({ view: 'solar', entityId: story.unlockEntityId })
      : undefined,
  }))
}
