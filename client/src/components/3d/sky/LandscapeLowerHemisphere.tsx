'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SkyViewState } from './skyViewState'
import { viewNadirLookAmount } from './skyViewState'
import { landscapeFragmentShader, landscapeVertexShader } from './landscapeShaders'
import { SKY_RENDER_ORDER } from './skyLayers'
import type { SkyLandscapePackConfig } from '@/features/explore/lib/skyLandscapePack'

type Props = {
  radius: number
  texture: THREE.Texture
  view: SkyViewState
  pack: SkyLandscapePackConfig
}

/**
 * Layer 7 — `type = spherical` (Stellarium): equirect, chân trời v=0.5, chỉ alt ≤ 0°.
 */
export function LandscapeLowerHemisphere({ radius, texture, view, pack }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const azRot = (pack.angleRotateZDeg * Math.PI) / 180

  const geometry = useMemo(() => {
    const segments = 128
    const rings = 48
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let row = 0; row <= rings; row++) {
      const t = row / rings
      const altDeg = -90 + t * 90
      const alt = (altDeg * Math.PI) / 180
      const cosAlt = Math.cos(alt)
      const sinAlt = Math.sin(alt)
      const vTex = 0.5 + altDeg / 180

      for (let seg = 0; seg <= segments; seg++) {
        const az = (seg / segments) * Math.PI * 2
        const cosAz = Math.cos(az)
        const sinAz = Math.sin(az)
        positions.push(cosAlt * sinAz * radius, sinAlt * radius, -cosAlt * cosAz * radius)
        let u = seg / segments + azRot / (Math.PI * 2)
        u -= Math.floor(u)
        uvs.push(u, vTex)
      }
    }

    const rowVerts = segments + 1
    for (let row = 0; row < rings; row++) {
      for (let seg = 0; seg < segments; seg++) {
        const a = row * rowVerts + seg
        const b = a + 1
        const c = a + rowVerts
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geom.setIndex(indices)
    geom.computeVertexNormals()
    return geom
  }, [radius, azRot])

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uDim: { value: pack.brightness },
      uNadirFade: { value: 0 },
    }),
    [texture, pack.brightness],
  )

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uNadirFade.value = viewNadirLookAmount(view)
  })

  return (
    <mesh geometry={geometry} renderOrder={SKY_RENDER_ORDER.landscape}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={landscapeVertexShader}
        fragmentShader={landscapeFragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}
