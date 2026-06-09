'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SKY_SHADER_GLSL1 } from './skyLayers'
import { useStereographicUniforms } from './StereographicContext'
import { STEREO_PROJECT_FN, STEREO_UNIFORMS } from './stereographicGlsl'

type Props = {
  geometry: THREE.BufferGeometry
  color: string | number
  opacity?: number
  renderOrder?: number
}

export function StereographicLineSegments({
  geometry,
  color,
  opacity = 0.35,
  renderOrder = 6,
}: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const stereo = useStereographicUniforms()

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uViewFromWorld: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 1 },
      uMaxTheta: { value: Math.PI },
      uAspect: { value: 1 },
    }),
    [color, opacity],
  )

  const vertexShader = useMemo(
    () => /* glsl */ `
      ${STEREO_UNIFORMS}
      ${STEREO_PROJECT_FN}
      void main() {
        vec2 ndc = stereographicNdc(position);
        if (!stereographicVisible(ndc)) {
          gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
        } else {
          gl_Position = vec4(ndc, 0.0, 1.0);
        }
      }
    `,
    [],
  )

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uViewFromWorld.value.copy(stereo.viewFromWorld)
    mat.uniforms.uTanHalfFov.value = stereo.tanHalfFov
    mat.uniforms.uMaxTheta.value = stereo.maxTheta
    mat.uniforms.uAspect.value = stereo.aspect
  })

  return (
    <lineSegments geometry={geometry} renderOrder={renderOrder} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        {...SKY_SHADER_GLSL1}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        vertexShader={vertexShader}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          void main() {
            gl_FragColor = vec4(uColor, uOpacity);
          }
        `}
      />
    </lineSegments>
  )
}
