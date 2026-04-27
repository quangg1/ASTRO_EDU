'use client'

import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useShowcaseStore } from '@/store/showcaseStore'

/**
 * NASA Eyes–style catalog lighting: strong readable base + subtle fill + optional studio key on focus.
 */
export function ShowcaseLighting() {
  const lightRef = useRef<THREE.PointLight>(null)
  useEffect(() => {
    useShowcaseStore.getState().setStudioLightRef(lightRef)
    return () => useShowcaseStore.getState().setStudioLightRef(null)
  }, [])

  return (
    <>
      <ambientLight intensity={0.88} color="#e8f0ff" />
      <hemisphereLight color="#c8d8ff" groundColor="#1a1a2e" intensity={0.32} />
      <directionalLight position={[-5, 8, 5]} intensity={0.38} color="#fff5e0" />
      <pointLight ref={lightRef} intensity={0} color="#ffffff" distance={28} decay={2} />
    </>
  )
}
