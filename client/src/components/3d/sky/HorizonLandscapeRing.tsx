'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

type Props = {
  radius: number
  texture: THREE.Texture
}

/**
 * Dải panorama quanh chân trời (alt ≈ 0°…−8°) — nằm trong vùng stereographic 185°.
 */
export function HorizonLandscapeRing({ radius, texture }: Props) {
  const geometry = useMemo(() => {
    const segments = 128
    const rows = 16
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let row = 0; row <= rows; row++) {
      const t = row / rows
      const vTex = 0.5 + t * 0.48
      const altDeg = 2 - t * 14
      const alt = (altDeg * Math.PI) / 180
      const cosAlt = Math.cos(alt)
      const sinAlt = Math.sin(alt)

      for (let seg = 0; seg <= segments; seg++) {
        const az = (seg / segments) * Math.PI * 2
        const cosAz = Math.cos(az)
        const sinAz = Math.sin(az)
        positions.push(cosAlt * sinAz * radius, sinAlt * radius, -cosAlt * cosAz * radius)
        uvs.push(seg / segments, 1 - vTex)
      }
    }

    const rowVerts = segments + 1
    for (let row = 0; row < rows; row++) {
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
  }, [radius])

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
