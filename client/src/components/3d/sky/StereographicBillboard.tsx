'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getGlowSpriteTexture } from './skyVisuals'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { useStereographicUniforms } from './StereographicContext'
import { STEREO_PROJECT_FN, STEREO_UNIFORMS } from './stereographicGlsl'

type Props = {
  position: [number, number, number]
  size: number
  color?: string
  opacity?: number
  onClick?: () => void
  renderOrder?: number
}

export function StereographicBillboard({
  position,
  size,
  color = '#ffffff',
  opacity = 0.92,
  onClick,
  renderOrder = SKY_RENDER_ORDER.planets,
}: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const stereo = useStereographicUniforms()
  const map = useMemo(() => getGlowSpriteTexture(), [])

  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uSize: { value: size },
      uAnchor: { value: new THREE.Vector3(...position) },
      uViewFromWorld: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 1 },
      uMaxTheta: { value: Math.PI },
      uAspect: { value: 1 },
    }),
    [map, color, opacity, size, position],
  )

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uViewFromWorld.value.copy(stereo.viewFromWorld)
    mat.uniforms.uTanHalfFov.value = stereo.tanHalfFov
    mat.uniforms.uMaxTheta.value = stereo.maxTheta
    mat.uniforms.uAspect.value = stereo.aspect
    mat.uniforms.uAnchor.value.set(position[0], position[1], position[2])
  })

  return (
    <mesh
      renderOrder={renderOrder}
      frustumCulled={false}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation()
              onClick()
            }
          : undefined
      }
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        {...SKY_SHADER_GLSL1}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_PROJECT_FN}
          uniform vec3 uAnchor;
          uniform float uSize;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec2 ndcCenter = stereographicNdc(uAnchor);
            if (!stereographicVisible(ndcCenter)) {
              gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
              return;
            }
            float s = uSize * 0.0035;
            vec2 corner = ndcCenter + (uv - 0.5) * 2.0 * s;
            gl_Position = vec4(corner, 0.0, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform sampler2D uMap;
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            vec4 tex = texture2D(uMap, vUv);
            gl_FragColor = vec4(uColor * tex.rgb, tex.a * uOpacity);
          }
        `}
      />
    </mesh>
  )
}
