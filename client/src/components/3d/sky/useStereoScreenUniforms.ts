'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStereographicUniforms } from './StereographicContext'

export function useStereoScreenUniforms(
  extra: Record<string, { value: unknown }> = {},
) {
  const stereo = useStereographicUniforms()
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null)

  if (!uniformsRef.current) {
    uniformsRef.current = {
      uViewFromWorld: { value: new THREE.Matrix3() },
      uWorldFromView: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 1 },
      uMaxTheta: { value: Math.PI },
      uAspect: { value: 1 },
      ...extra,
    }
  }

  useFrame(() => {
    const u = uniformsRef.current!
    ;(u.uViewFromWorld.value as THREE.Matrix3).copy(stereo.viewFromWorld)
    ;(u.uWorldFromView.value as THREE.Matrix3).copy(stereo.worldFromView)
    u.uTanHalfFov.value = stereo.tanHalfFov
    u.uMaxTheta.value = stereo.maxTheta
    u.uAspect.value = stereo.aspect
  })

  return uniformsRef.current
}
