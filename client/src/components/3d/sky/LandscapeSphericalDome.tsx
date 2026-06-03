'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStereographicUniforms } from './StereographicContext'
import {
  landscapeSphereFragmentShader,
  landscapeSphereVertexShader,
} from './landscapeSphericalShaders'
import { SKY_RENDER_ORDER } from './skyLayers'
import type { SkyLandscapePackConfig } from '@/features/explore/lib/skyLandscapePack'

type Props = {
  radius: number
  texture: THREE.Texture
  pack: SkyLandscapePackConfig
}

/**
 * Vỏ cầu trong observer — landscape world-fixed, mọi góc nhìn (zenith / chân trời / nadir).
 */
export function LandscapeSphericalDome({ radius, texture, pack }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const stereo = useStereographicUniforms()
  const azRot = (pack.angleRotateZDeg * Math.PI) / 180

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uDim: { value: pack.brightness },
      uAzRot: { value: azRot },
      uViewFromWorld: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 1 },
      uMaxTheta: { value: Math.PI },
    }),
    [texture, pack.brightness, azRot],
  )

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uViewFromWorld.value.copy(stereo.viewFromWorld)
    mat.uniforms.uTanHalfFov.value = stereo.tanHalfFov
    mat.uniforms.uMaxTheta.value = stereo.maxTheta
  })

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.landscape} frustumCulled={false}>
      <sphereGeometry args={[radius, 64, 40]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={landscapeSphereVertexShader}
        fragmentShader={landscapeSphereFragmentShader}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  )
}
