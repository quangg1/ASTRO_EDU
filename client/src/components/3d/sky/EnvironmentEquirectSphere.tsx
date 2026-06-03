'use client'

import * as THREE from 'three'

type Props = {
  radius: number
  texture: THREE.Texture
}

/**
 * Panorama equirect 2:1 bọc sphere (quan sát từ trong).
 * Chân trời ở giữa ảnh (v≈0.5): nhìn lên = thiên đỉnh, nhìn xuống = đất ở tâm (Stellarium).
 */
export function EnvironmentEquirectSphere({ radius, texture }: Props) {
  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[radius, 96, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
