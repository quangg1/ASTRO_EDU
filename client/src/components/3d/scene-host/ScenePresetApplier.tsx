'use client'

import { useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { DEFAULT_CAMERA_FAR, DEFAULT_SCENE_DPR, type ScenePreset } from './scenePreset'

/**
 * Đưa camera / renderer / scene về đúng preset khi Canvas dùng chung đổi cảnh.
 * Chạy ở layout effect nên xong trước effect của nội dung cảnh mới (vd. cảnh
 * Showcase tự chỉnh fov/far sau đó).
 */
export function ScenePresetApplier({ preset }: { preset: ScenePreset }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const raycaster = useThree((s) => s.raycaster)
  const setDpr = useThree((s) => s.setDpr)

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (cam.isPerspectiveCamera) {
      const { position, fov, near = 0.1, far = DEFAULT_CAMERA_FAR } = preset.camera
      cam.clearViewOffset()
      cam.position.set(...position)
      cam.up.set(0, 1, 0)
      cam.zoom = 1
      cam.fov = fov
      cam.near = near
      cam.far = far
      cam.lookAt(0, 0, 0)
      cam.updateProjectionMatrix()
    }

    gl.toneMappingExposure = preset.toneMappingExposure
    scene.background = new THREE.Color(preset.background)
    scene.fog = null
    raycaster.params.Points = { threshold: preset.raycast?.points ?? 1 }
    raycaster.params.Line = { threshold: preset.raycast?.line ?? 1 }
    setDpr(preset.dpr ?? DEFAULT_SCENE_DPR)
  }, [preset, camera, gl, scene, raycaster, setDpr])

  return null
}
