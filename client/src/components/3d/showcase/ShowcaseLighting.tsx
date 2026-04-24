'use client'

import * as THREE from 'three'
import { useMemo } from 'react'
import { useShowcaseStore } from '@/store/showcaseStore'

/**
 * NASA Eyes–style catalog lighting: strong readable base + subtle fill + optional studio key on focus.
 */
export function ShowcaseLighting() {
  const focused = useShowcaseStore((s) => s.focusedStudioPosition)
  const studioPos = useMemo(() => {
    if (!focused) return null
    return focused.clone().add(new THREE.Vector3(2.2, 1.4, 2.2))
  }, [focused])

  return (
    <>
      <ambientLight intensity={0.88} color="#e8f0ff" />
      <hemisphereLight color="#c8d8ff" groundColor="#1a1a2e" intensity={0.32} />
      <directionalLight position={[-5, 8, 5]} intensity={0.38} color="#fff5e0" />
      {studioPos && (
        <pointLight
          position={[studioPos.x, studioPos.y, studioPos.z]}
          intensity={0.55}
          color="#ffffff"
          distance={28}
          decay={2}
        />
      )}
    </>
  )
}
