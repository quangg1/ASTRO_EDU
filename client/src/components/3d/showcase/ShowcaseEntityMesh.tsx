'use client'

import { getStaticAssetUrl, resolveMediaUrl } from '@/lib/apiConfig'
import { isResolvableShowcaseAssetUrl } from '@/lib/showcaseMediaUrl'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { ShowcaseDiffuseGlobe } from '@/components/3d/showcase/ShowcaseDiffuseGlobe'
import { ShowcaseModelEntityMesh } from '@/components/3d/showcase/ShowcaseModelEntityMesh'

export function ShowcaseEntityMesh({
  entity,
  active,
  visualOpacity = 1,
  skipDistanceBasedScale = false,
  onSelect,
}: {
  entity: ShowcaseOrbitEntity
  active: boolean
  visualOpacity?: number
  /** Giữ tỉ lệ mesh con/cha khi focus — không phóng theo camera. */
  skipDistanceBasedScale?: boolean
  onSelect?: () => void
}) {
  const remoteModelRaw = entity.remoteModelUrl?.trim()
  if (remoteModelRaw && isResolvableShowcaseAssetUrl(remoteModelRaw)) {
    return (
      <ShowcaseModelEntityMesh
        entity={entity}
        modelUrl={resolveMediaUrl(remoteModelRaw)}
        active={active}
        onSelect={onSelect}
      />
    )
  }

  if (entity.modelPath) {
    return (
      <ShowcaseModelEntityMesh
        entity={entity}
        modelUrl={getStaticAssetUrl(entity.modelPath)}
        active={active}
        onSelect={onSelect}
      />
    )
  }

  const sphereRadius = Math.max(0.14, entity.size * 2.55)

  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <ShowcaseDiffuseGlobe
        entity={entity}
        sphereRadius={sphereRadius}
        visualOpacity={visualOpacity}
        active={active}
        skipDistanceBasedScale={skipDistanceBasedScale || active}
      />
    </group>
  )
}
