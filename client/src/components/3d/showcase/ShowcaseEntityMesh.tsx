'use client'

import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { applyGlobeTextureQuality } from '@/lib/planetTextureQuality'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { ShowcaseModelEntityMesh } from '@/components/3d/showcase/ShowcaseModelEntityMesh'

export function ShowcaseEntityMesh({
  entity,
  active,
  onSelect,
}: {
  entity: ShowcaseOrbitEntity
  active: boolean
  onSelect?: () => void
}) {
  if (!active) return null

  if (entity.modelPath) {
    return <ShowcaseModelEntityMesh entity={entity} active={active} onSelect={onSelect} />
  }
  const { gl } = useThree()
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!entity.texturePath) {
      setTex(null)
      return
    }
    let alive = true
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const assetVersion =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ASSET_VERSION) || ''
    const baseUrl = getStaticAssetUrl(entity.texturePath)
    const url = assetVersion
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(assetVersion)}`
      : baseUrl
    const applyLoaded = (loaded: THREE.Texture) => {
      if (!alive) return
      applyGlobeTextureQuality(loaded, gl)
      setTex(loaded)
    }
    loader.load(
      url,
      applyLoaded,
      undefined,
      () => {
        if (!alive) return
        const retryUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`
        loader.load(
          retryUrl,
          applyLoaded,
          undefined,
          () => {
            if (!alive) return
            console.error('[ShowcaseEntityMesh] Texture load failed:', retryUrl)
            // Keep scene usable when CDN/browser cache serves a broken cross-origin response.
            setTex(null)
          },
        )
      },
    )
    return () => {
      alive = false
    }
  }, [entity.texturePath, gl])

  if (entity.texturePath && !tex) return null

  return (
    <mesh
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
      <sphereGeometry args={[Math.max(0.055, entity.size * 1.5), 28, 20]} />
      {tex ? (
        <meshBasicMaterial map={tex} toneMapped={false} />
      ) : (
        <meshBasicMaterial color={entity.color} toneMapped={false} />
      )}
    </mesh>
  )
}
