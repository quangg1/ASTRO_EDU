'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SKY_RENDER_ORDER } from './skyLayers'
import { useStereographicUniforms } from './StereographicContext'
import { STEREO_PROJECT_FN, STEREO_UNIFORMS } from './stereographicGlsl'

type Props = {
  radius: number
  texture: THREE.Texture
}

export function MilkyWayStereographic({ radius, texture }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const stereo = useStereographicUniforms()

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uViewFromWorld: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 1 },
      uMaxTheta: { value: Math.PI },
    }),
    [texture],
  )

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uViewFromWorld.value.copy(stereo.viewFromWorld)
    mat.uniforms.uTanHalfFov.value = stereo.tanHalfFov
    mat.uniforms.uMaxTheta.value = stereo.maxTheta
  })

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.milkyWay} frustumCulled={false}>
      <sphereGeometry args={[radius, 40, 28]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        vertexShader={/* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_PROJECT_FN}
          varying vec3 vWorldDir;
          void main() {
            vWorldDir = normalize(position);
            vec2 ndc = stereographicNdc(position);
            if (!stereographicVisible(ndc)) {
              gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            } else {
              gl_Position = vec4(ndc, 0.0, 1.0);
            }
          }
        `}
        fragmentShader={/* glsl */ `
          uniform sampler2D uMap;
          varying vec3 vWorldDir;
          const float PI = 3.14159265359;
          void main() {
            float alt = asin(clamp(vWorldDir.y, -1.0, 1.0));
            if (alt < 0.0) discard;
            float az = atan(vWorldDir.x, -vWorldDir.z);
            float u = az / (2.0 * PI) + 0.5;
            float v = 0.5 + alt / PI;
            vec4 tex = texture2D(uMap, vec2(u, v));
            gl_FragColor = vec4(tex.rgb, tex.a * 0.48);
          }
        `}
      />
    </mesh>
  )
}
