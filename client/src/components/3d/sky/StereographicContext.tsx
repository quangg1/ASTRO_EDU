'use client'

import { createContext, useContext, useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { viewRotationMatrix3, type SkyViewState } from './skyViewState'

export type StereographicUniforms = {
  viewFromWorld: THREE.Matrix3
  worldFromView: THREE.Matrix3
  tanHalfFov: number
  maxTheta: number
  /** width / height — giữ đĩa chiếu tròn, landscape không bị kéo ngang. */
  aspect: number
}

const StereographicCtx = createContext<StereographicUniforms | null>(null)

export function useStereographicUniforms(): StereographicUniforms {
  const ctx = useContext(StereographicCtx)
  if (!ctx) throw new Error('useStereographicUniforms outside StereographicProvider')
  return ctx
}

export function buildStereographicUniforms(view: SkyViewState, fovDeg: number): StereographicUniforms {
  const maxTheta = ((fovDeg * 0.5) * Math.PI) / 180
  const worldFromView = viewRotationMatrix3(view)
  const viewFromWorld = worldFromView.clone().transpose()
  return {
    viewFromWorld,
    worldFromView,
    tanHalfFov: Math.tan(maxTheta * 0.5),
    maxTheta,
    aspect: 1,
  }
}

type Props = {
  view: SkyViewState
  fovDeg: number
  children: React.ReactNode
}

/** Ortho viewport + uniforms — thay cube camera (1 pass, không render 6 mặt). */
export function StereographicProvider({ view, fovDeg, children }: Props) {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(size.height, 1)
  const uniforms = useMemo(
    () => ({ ...buildStereographicUniforms(view, fovDeg), aspect }),
    [view.viewAzRad, view.viewAltRad, fovDeg, aspect],
  )

  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    cam.left = -1
    cam.right = 1
    cam.top = 1
    cam.bottom = -1
    cam.near = 0.5
    cam.far = 2
    cam.position.set(0, 0, 1)
    cam.lookAt(0, 0, 0)
    cam.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  return <StereographicCtx.Provider value={uniforms}>{children}</StereographicCtx.Provider>
}
