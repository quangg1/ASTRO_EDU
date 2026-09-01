import { buildStudioGlobeEntity } from '@/features/content3d/showcase/lib/mergeShowcaseCatalog'
import { resolveShowcaseDiffuseTextureUrl } from '@/lib/showcaseMediaUrl'
import { getNasaCatalogItemById } from '@/features/content3d/showcase/lib/showcaseEntities'
import type { ShowcaseEntityContentDTO } from '@/features/content3d/showcase/api/showcaseEntitiesApi'

/** Texture equirectangular cho map picker — cùng diffuse URL như globe 3D (ShowcaseDiffuseGlobe). */
export function getStudioGlobeTextureUrl(
  entityId: string,
  showcaseContent?: ShowcaseEntityContentDTO[] | undefined,
): string | null {
  const entity = buildStudioGlobeEntity(entityId, showcaseContent)
  if (!entity) return null
  return resolveShowcaseDiffuseTextureUrl(entity)
}

export function getStudioGlobeDisplayName(entityId: string): string {
  const cat = getNasaCatalogItemById(entityId)
  return cat?.name || entityId
}
