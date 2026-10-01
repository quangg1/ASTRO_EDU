'use client'

import { Suspense, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import { DEFAULT_CAMERA_FAR, DEFAULT_SCENE_DPR, type ScenePreset } from './scenePreset'
import { ScenePresetApplier } from './ScenePresetApplier'

function canvasProps(preset: ScenePreset) {
  return {
    camera: {
      position: preset.camera.position,
      fov: preset.camera.fov,
      near: preset.camera.near ?? 0.1,
      far: preset.camera.far ?? DEFAULT_CAMERA_FAR,
    },
    dpr: preset.dpr ?? DEFAULT_SCENE_DPR,
    gl: { antialias: true, alpha: false, powerPreference: 'high-performance' as const },
    raycaster: {
      params: {
        Mesh: {},
        Line: { threshold: preset.raycast?.line ?? 1 },
        LOD: {},
        Points: { threshold: preset.raycast?.points ?? 1 },
        Sprite: {},
      },
    },
  }
}

/** Canvas riêng cho một cảnh (trang khóa học, Studio preview). */
export function StandaloneSceneCanvas({
  preset,
  className,
  children,
}: {
  preset: ScenePreset
  className?: string
  children: ReactNode
}) {
  return (
    <Canvas
      {...canvasProps(preset)}
      className={className}
      style={{ background: preset.background, touchAction: 'none' }}
      onPointerMissed={preset.onPointerMissed}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = preset.toneMappingExposure
      }}
    >
      <color attach="background" args={[preset.background]} />
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
    </Canvas>
  )
}

/**
 * Một Canvas sống suốt trang Explore: đổi cảnh chỉ thay nội dung và áp preset,
 * không hủy WebGL context — texture / shader đã nạp lên GPU được dùng lại.
 * `active = false` (đang ở bầu trời, có Canvas riêng) thì ẩn và dừng vòng render.
 */
export function SharedSceneCanvas({
  preset,
  active = true,
  children,
}: {
  preset: ScenePreset
  active?: boolean
  children: ReactNode
}) {
  const presetRef = useRef(preset)
  presetRef.current = preset
  const initialRef = useRef(canvasProps(preset))

  return (
    <div
      className="absolute inset-0"
      style={{ display: active ? 'block' : 'none', background: preset.background }}
      aria-hidden={!active}
    >
      <Canvas
        {...initialRef.current}
        frameloop={active ? 'always' : 'never'}
        style={{ background: preset.background, touchAction: 'none' }}
        onPointerMissed={() => presetRef.current.onPointerMissed?.()}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
        }}
      >
        <ScenePresetApplier preset={preset} />
        <Suspense key={preset.id} fallback={null}>
          {children}
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  )
}
