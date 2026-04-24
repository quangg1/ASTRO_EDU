'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'

export function ShowcaseModelEntityMesh({
  entity,
  active,
  onSelect,
}: {
  entity: ShowcaseOrbitEntity
  active: boolean
  onSelect?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const gltf = useGLTF(getStaticAssetUrl(entity.modelPath ?? '')) as { scene: THREE.Object3D }
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  const normalizedScale = useMemo(() => {
    const bbox = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    bbox.getSize(size)
    const maxAxis = Math.max(size.x, size.y, size.z, 1e-6)
    const targetDiameter = entity.size * 2.4
    return targetDiameter / maxAxis
  }, [model, entity.size])
  const userScale = entity.modelScale ?? 1
  const scale = normalizedScale * userScale * (active ? 1.18 : 1)
  const rot = entity.modelRotationDeg ?? [0, 0, 0]
  useFrame((_, dt) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += dt * (active ? 0.24 : 0.14)
  })
  return (
    <group
      ref={groupRef}
      scale={[scale, scale, scale]}
      rotation={[
        THREE.MathUtils.degToRad(rot[0]),
        THREE.MathUtils.degToRad(rot[1]),
        THREE.MathUtils.degToRad(rot[2]),
      ]}
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
      <primitive object={model} />
    </group>
  )
}
