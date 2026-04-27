'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { applyGlobeTextureQuality } from '@/lib/planetTextureQuality'
import { getStaticAssetUrl, resolveMediaUrl } from '@/lib/apiConfig'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { ShowcaseModelEntityMesh } from '@/components/3d/showcase/ShowcaseModelEntityMesh'

type TextureBundle = {
  map: THREE.Texture | null
  normalMap: THREE.Texture | null
  specularMap: THREE.Texture | null
  cloud: THREE.Texture | null
}

const emptyBundle: TextureBundle = { map: null, normalMap: null, specularMap: null, cloud: null }

function disposeBundle(b: TextureBundle) {
  b.map?.dispose()
  b.normalMap?.dispose()
  b.specularMap?.dispose()
  b.cloud?.dispose()
}

function loadTextureAsync(resolvedUrl: string, gl: THREE.WebGLRenderer): Promise<THREE.Texture | null> {
  if (!resolvedUrl) return Promise.resolve(null)
  return new Promise((resolve) => {
    let finished = false
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const assetVersion = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ASSET_VERSION) || ''
    const base =
      /^https?:\/\//i.test(resolvedUrl) || resolvedUrl.startsWith('http')
        ? resolvedUrl
        : assetVersion
          ? `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(assetVersion)}`
          : resolvedUrl
    const done = (tex: THREE.Texture | null) => {
      if (finished) {
        tex?.dispose()
        return
      }
      finished = true
      if (tex) applyGlobeTextureQuality(tex, gl)
      resolve(tex)
    }
    loader.load(
      base,
      (t) => done(t),
      undefined,
      () => {
        loader.load(
          `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`,
          (t2) => done(t2),
          undefined,
          () => {
            console.error('[ShowcaseEntityMesh] Texture load failed:', resolvedUrl)
            done(null)
          },
        )
      },
    )
  })
}

export function ShowcaseEntityMesh({
  entity,
  active,
  visualOpacity = 1,
  onSelect,
}: {
  entity: ShowcaseOrbitEntity
  active: boolean
  visualOpacity?: number
  onSelect?: () => void
}) {
  const remoteModelRaw = entity.remoteModelUrl?.trim()
  if (
    remoteModelRaw &&
    (/^https?:\/\//i.test(remoteModelRaw) || remoteModelRaw.startsWith('/files/'))
  ) {
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

  return (
    <ShowcaseSphereMesh entity={entity} active={active} visualOpacity={visualOpacity} onSelect={onSelect} />
  )
}

function ShowcaseSphereMesh({
  entity,
  active,
  visualOpacity = 1,
  onSelect,
}: {
  entity: ShowcaseOrbitEntity
  active: boolean
  visualOpacity?: number
  onSelect?: () => void
}) {

  const { gl } = useThree()
  const rootRef = useRef<THREE.Group>(null)
  const worldPosRef = useRef(new THREE.Vector3())
  const [bundle, setBundle] = useState<TextureBundle>(emptyBundle)

  const diffuseKey = entity.remoteTextureUrl?.trim() || entity.texturePath || ''
  const normalKey = entity.remoteNormalMapUrl?.trim() || ''
  const specKey = entity.remoteSpecularMapUrl?.trim() || ''
  const cloudKey = entity.remoteCloudMapUrl?.trim() || ''

  useEffect(() => {
    let cancelled = false
    setBundle(emptyBundle)

    const staticDiffuse = entity.texturePath ? getStaticAssetUrl(entity.texturePath) : ''
    const remoteD = entity.remoteTextureUrl?.trim()
    const diffuseResolved = remoteD ? resolveMediaUrl(remoteD) : staticDiffuse

    void (async () => {
      const [map, normalMap, specularMap, cloud] = await Promise.all([
        diffuseResolved ? loadTextureAsync(diffuseResolved, gl) : Promise.resolve(null),
        normalKey ? loadTextureAsync(resolveMediaUrl(normalKey), gl) : Promise.resolve(null),
        specKey ? loadTextureAsync(resolveMediaUrl(specKey), gl) : Promise.resolve(null),
        cloudKey ? loadTextureAsync(resolveMediaUrl(cloudKey), gl) : Promise.resolve(null),
      ])
      if (cancelled) {
        map?.dispose()
        normalMap?.dispose()
        specularMap?.dispose()
        cloud?.dispose()
        return
      }
      setBundle({ map, normalMap, specularMap, cloud })
    })()

    return () => {
      cancelled = true
      setBundle((prev) => {
        disposeBundle(prev)
        return emptyBundle
      })
    }
  }, [gl, diffuseKey, normalKey, specKey, cloudKey, entity.texturePath])

  const radius = Math.max(0.14, entity.size * 2.55)
  const entityId = String(entity.id || '').trim()
  const fallbackColor =
    entityId.startsWith('sc-')
      ? '#d7dbe7'
      : entityId.startsWith('comet-')
        ? '#7fbef0'
        : entityId.startsWith('moon-')
          ? '#9ca3af'
          : entityId.startsWith('asteroid-')
            ? '#5a4637'
            : entityId.startsWith('planet-')
              ? '#b48a5a'
              : entity.color
  const mayLoadMaps = Boolean(diffuseKey || normalKey || specKey || cloudKey || entity.texturePath || entity.remoteTextureUrl)

  useFrame(({ camera }) => {
    const root = rootRef.current
    if (!root) return
    root.getWorldPosition(worldPosRef.current)
    const d = camera.position.distanceTo(worldPosRef.current)
    const near = Math.max(1.8, radius * 12)
    const far = Math.max(22, radius * 90)
    const t = THREE.MathUtils.smoothstep(d, near, far)
    // NASA Eyes trick: xa thì phóng nhẹ để thấy, gần thì về scale thực.
    const boostFar = active ? 2.4 : 2.1
    const scale = THREE.MathUtils.lerp(active ? 1.08 : 1, boostFar, t)
    root.scale.setScalar(scale)
  })

  if (!mayLoadMaps) return null

  return (
    <group
      ref={rootRef}
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
      <mesh>
        <sphereGeometry args={[radius, 28, 20]} />
        {bundle.map || bundle.normalMap || bundle.specularMap ? (
          <meshPhongMaterial
            map={bundle.map || undefined}
            normalMap={bundle.normalMap || undefined}
            specularMap={bundle.specularMap || undefined}
            color={entity.color}
            specular={0xa8a8b8}
            shininess={20}
            transparent={visualOpacity < 0.999}
            opacity={visualOpacity}
            toneMapped={false}
          />
        ) : (
          <meshBasicMaterial color={fallbackColor} transparent={visualOpacity < 0.999} opacity={visualOpacity} toneMapped={false} />
        )}
      </mesh>
      {bundle.cloud ? (
        <mesh scale={[1.012, 1.012, 1.012]}>
          <sphereGeometry args={[radius, 28, 20]} />
          <meshStandardMaterial
            map={bundle.cloud}
            transparent
            depthWrite={false}
            opacity={0.9 * visualOpacity}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
    </group>
  )
}
