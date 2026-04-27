'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'

export function ShowcaseModelEntityMesh({
  entity,
  modelUrl,
  active,
  onSelect,
}: {
  entity: ShowcaseOrbitEntity
  /** URL đầy đủ (HTTPS CDN) hoặc đã resolve /files + static CDN. */
  modelUrl: string
  active: boolean
  onSelect?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const gltf = useGLTF(modelUrl) as { scene: THREE.Object3D }
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
  const rot = entity.modelRotationDeg ?? [0, 0, 0]
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.rotation.set(
      THREE.MathUtils.degToRad(rot[0]),
      THREE.MathUtils.degToRad(rot[1]),
      THREE.MathUtils.degToRad(rot[2]),
    )
  }, [rot[0], rot[1], rot[2]])
  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    g.rotation.y += dt * (active ? 0.24 : 0.14)
    const target = normalizedScale * userScale * (active ? 1.35 : 1)
    g.scale.setScalar(target)
  })
  return (
    <group
      ref={groupRef}
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
