'use client'

import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useShowcaseStore } from '@/features/content3d/showcase/public'

/**
 * Ánh sáng catalog Explore — Mặt Trời tại gốc (0,0,0) là nguồn chính.
 * Ambient thấp để thấy sáng/tối trên meshPhong / meshStandard.
 * `studioLightRef`: fill nhẹ khi camera zoom entity (ShowcaseCameraManager).
 */
export function ShowcaseLighting() {
  const lightRef = useRef<THREE.PointLight>(null)
  useEffect(() => {
    useShowcaseStore.getState().setStudioLightRef(lightRef)
    return () => useShowcaseStore.getState().setStudioLightRef(null)
  }, [])

  return (
    <>
      <ambientLight intensity={0.18} color="#1a2440" />
      <hemisphereLight color="#9ec0f0" groundColor="#080a14" intensity={0.32} />
      {/* Mặt Trời tại gốc — decay=0: không suy hao theo khoảng cách quỹ đạo, vẫn có terminator sáng/tối */}
      <pointLight position={[0, 0, 0]} intensity={5.5} color="#fff4e0" decay={0} distance={0} />
      <directionalLight position={[55, 22, 38]} intensity={0.35} color="#ffe9c8" />
      <pointLight ref={lightRef} intensity={0} color="#ffffff" distance={32} decay={2} />
    </>
  )
}
