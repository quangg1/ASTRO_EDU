'use client'

import type { MeshProps } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { applyGlobeTextureQuality } from '@/lib/planetTextureQuality'
import { resolveMediaUrl } from '@/lib/apiConfig'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { resolveShowcaseEntitySpinPeriod } from '@/lib/showcaseEntities'
import { isUsableShowcaseCloudMapUrl, resolveShowcaseDiffuseTextureUrl } from '@/lib/showcaseMediaUrl'

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

/** Cùng pipeline load diffuse như `ShowcaseEntityMesh` (studio / CDN). */
export function loadShowcaseDiffuseTexture(resolvedUrl: string, gl: THREE.WebGLRenderer): Promise<THREE.Texture | null> {
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
            console.error('[ShowcaseDiffuseGlobe] Texture load failed:', resolvedUrl)
            done(null)
          },
        )
      },
    )
  })
}

export type ShowcaseDiffuseGlobeProps = {
  entity: ShowcaseOrbitEntity
  sphereRadius: number
  visualOpacity?: number
  /** Zoom scaling kiểu NASA Eyes — tắt cho Mars History (globe cố định). */
  skipDistanceBasedScale?: boolean
  /** Chỉ dùng khi không skip — boost nhẹ khi entity đang active */
  active?: boolean
  /** Tự quay quanh trục (giây/vòng); mặc định suy từ entity. */
  spinPeriod?: number
  spinTimeScale?: number
  meshProps?: Omit<MeshProps, 'children'>
}

/**
 * Quả cầu diffuse + normal/spec/cloud như layer showcase orbit —
 * Mars History và entity sphere dùng chung để không nhân đôi loader/CMS.
 */
export function ShowcaseDiffuseGlobe({
  entity,
  sphereRadius,
  visualOpacity = 1,
  skipDistanceBasedScale = false,
  active = false,
  spinPeriod: spinPeriodProp,
  spinTimeScale = 1,
  meshProps,
}: ShowcaseDiffuseGlobeProps) {
  const { gl } = useThree()
  const rootRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const worldPosRef = useRef(new THREE.Vector3())
  const spinPeriod = spinPeriodProp ?? resolveShowcaseEntitySpinPeriod(entity)
  const [bundle, setBundle] = useState<TextureBundle>(emptyBundle)

  const diffuseKey = entity.remoteTextureUrl?.trim() || entity.texturePath || ''
  const normalKey = entity.remoteNormalMapUrl?.trim() || ''
  const specKey = entity.remoteSpecularMapUrl?.trim() || ''
  const cloudKeyRaw = entity.remoteCloudMapUrl?.trim() || ''

  useEffect(() => {
    let cancelled = false
    setBundle(emptyBundle)

    const diffuseResolved = resolveShowcaseDiffuseTextureUrl(entity) || ''
    const cloudKey = isUsableShowcaseCloudMapUrl(cloudKeyRaw, diffuseResolved || diffuseKey)
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
  }, [gl, diffuseKey, normalKey, specKey, cloudKeyRaw, entity.texturePath])

  const radius = sphereRadius
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

  useFrame(({ camera }, delta) => {
    const spin = spinRef.current
    if (spin && spinPeriod > 0 && !active) {
      spin.rotation.y += delta * spinTimeScale * ((2 * Math.PI) / spinPeriod)
    }
    if (skipDistanceBasedScale) return
    const root = rootRef.current
    if (!root) return
    root.getWorldPosition(worldPosRef.current)
    const d = camera.position.distanceTo(worldPosRef.current)
    const near = Math.max(1.8, radius * 12)
    const far = Math.max(22, radius * 90)
    const t = THREE.MathUtils.smoothstep(d, near, far)
    const boostFar = active ? 2.4 : 2.1
    const scale = THREE.MathUtils.lerp(active ? 1.08 : 1, boostFar, t)
    root.scale.setScalar(scale)
  })

  return (
    <group ref={rootRef}>
      <group ref={spinRef}>
      <mesh {...meshProps}>
        <sphereGeometry args={[radius, 96, 88]} />
        {bundle.map || bundle.normalMap || bundle.specularMap ? (
          <meshPhongMaterial
            map={bundle.map || undefined}
            normalMap={bundle.normalMap || undefined}
            specularMap={bundle.specularMap || undefined}
            color={bundle.map ? '#ffffff' : entity.color}
            specular={0xb8b8c8}
            shininess={24}
            emissive={bundle.map ? '#ffffff' : '#000000'}
            emissiveMap={bundle.map || undefined}
            emissiveIntensity={bundle.map ? 0.38 : 0}
            transparent={visualOpacity < 0.999}
            opacity={visualOpacity}
            toneMapped
          />
        ) : (
          <meshBasicMaterial
            color={fallbackColor}
            transparent={visualOpacity < 0.999}
            opacity={visualOpacity}
            toneMapped={false}
          />
        )}
      </mesh>
      {bundle.cloud ? (
        <mesh scale={[1.012, 1.012, 1.012]}>
          <sphereGeometry args={[radius, 96, 88]} />
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
    </group>
  )
}
