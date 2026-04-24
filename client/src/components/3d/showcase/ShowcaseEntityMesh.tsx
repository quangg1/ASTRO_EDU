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
    loader.load(
      getStaticAssetUrl(entity.texturePath),
      (loaded) => {
        if (!alive) return
        applyGlobeTextureQuality(loaded, gl)
        setTex(loaded)
      },
      undefined,
      () => {
        if (!alive) return
        setTex(null)
      },
    )
    return () => {
      alive = false
    }
  }, [entity.texturePath, gl])
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
      <sphereGeometry args={[active ? entity.size * 1.45 : entity.size, 16, 16]} />
      {tex ? (
        <meshBasicMaterial map={tex} />
      ) : (
        <meshBasicMaterial color={entity.color} />
      )}
    </mesh>
  )
}
