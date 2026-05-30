'use client'

import type { MeshProps } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { usePlanetNarrativeStore } from '@/features/content3d/narrative/stores/planetNarrativeStore'
import { resolveMediaUrl } from '@/lib/apiConfig'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import {
  isResolvableShowcaseAssetUrl,
  isUsableShowcaseCloudMapUrl,
  resolveShowcaseDiffuseTextureUrl,
} from '@/lib/showcaseMediaUrl'
import { loadShowcaseDiffuseTexture } from '@/components/3d/showcase/ShowcaseDiffuseGlobe'

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

function resolveBeatTextureUrl(raw: string | undefined | null): string {
  const key = String(raw || '').trim()
  if (!key) return ''
  if (isResolvableShowcaseAssetUrl(key)) return resolveMediaUrl(key)
  if (key.startsWith('/')) return key
  return resolveMediaUrl(key)
}

type Props = {
  entity: ShowcaseOrbitEntity
  sphereRadius: number
  meshProps?: Omit<MeshProps, 'children'>
}

/**
 * Deep History globe — cùng pipeline Studio như Showcase:
 * 1) `beat.visual.textureUrl` (texture từng thời kỳ trong Narrative Studio)
 * 2) diffuse/normal/spec/cloud của entity từ Showcase CMS
 * 3) `globeTint` / màu catalog (chỉ khi không có file texture)
 */
export function NarrativeBeatAlbedoGlobe({ entity, sphereRadius, meshProps }: Props) {
  const { gl } = useThree()
  const currentBeat = usePlanetNarrativeStore((s) => s.currentBeat)
  const beatTextureRaw = String(currentBeat.visual?.textureUrl || '').trim()
  const beatDiffuseResolved = useMemo(() => resolveBeatTextureUrl(beatTextureRaw), [beatTextureRaw])
  const entityDiffuseResolved = useMemo(
    () => resolveShowcaseDiffuseTextureUrl(entity) || '',
    [entity.id, entity.remoteTextureUrl, entity.texturePath],
  )
  const diffuseResolved = beatDiffuseResolved || entityDiffuseResolved

  const normalKey = entity.remoteNormalMapUrl?.trim() || ''
  const specKey = entity.remoteSpecularMapUrl?.trim() || ''
  const cloudKeyRaw = entity.remoteCloudMapUrl?.trim() || ''

  const [bundle, setBundle] = useState<TextureBundle>(emptyBundle)

  useEffect(() => {
    let cancelled = false
    setBundle(emptyBundle)

    const cloudKey = isUsableShowcaseCloudMapUrl(cloudKeyRaw, diffuseResolved || entityDiffuseResolved)
      ? cloudKeyRaw
      : ''

    void (async () => {
      const [map, normalMap, specularMap, cloud] = await Promise.all([
        diffuseResolved ? loadShowcaseDiffuseTexture(diffuseResolved, gl) : Promise.resolve(null),
        normalKey ? loadShowcaseDiffuseTexture(resolveMediaUrl(normalKey), gl) : Promise.resolve(null),
        specKey ? loadShowcaseDiffuseTexture(resolveMediaUrl(specKey), gl) : Promise.resolve(null),
        cloudKey ? loadShowcaseDiffuseTexture(resolveMediaUrl(cloudKey), gl) : Promise.resolve(null),
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
  }, [gl, diffuseResolved, entityDiffuseResolved, normalKey, specKey, cloudKeyRaw, currentBeat.id])

  const tint = currentBeat.visual?.globeTint || entity.color || '#b48a5a'
  const hasMaps = Boolean(bundle.map || bundle.normalMap || bundle.specularMap)

  return (
    <group>
      <mesh {...meshProps}>
        <sphereGeometry args={[sphereRadius, 96, 88]} />
        {hasMaps ? (
          <meshPhongMaterial
            map={bundle.map || undefined}
            normalMap={bundle.normalMap || undefined}
            specularMap={bundle.specularMap || undefined}
            color={bundle.map ? '#ffffff' : tint}
            specular="#888888"
            shininess={12}
            emissive={bundle.map ? '#ffffff' : '#000000'}
            emissiveMap={bundle.map || undefined}
            emissiveIntensity={bundle.map ? 0.38 : 0}
            toneMapped
          />
        ) : (
          <meshBasicMaterial color={tint} toneMapped={false} />
        )}
      </mesh>
      {bundle.cloud ? (
        <mesh scale={[1.012, 1.012, 1.012]}>
          <sphereGeometry args={[sphereRadius, 96, 88]} />
          <meshStandardMaterial
            map={bundle.cloud}
            transparent
            depthWrite={false}
            opacity={0.9}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
    </group>
  )
}
