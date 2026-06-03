'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { useStereographicUniforms } from './StereographicContext'

/** Vùng ngoài đĩa chiếu — nền tối đồng màu. */
export function StereographicBackdrop() {
  const stereo = useStereographicUniforms()

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        depthTest: false,
        depthWrite: false,
        uniforms: { uAspect: { value: 1 } },
        vertexShader: /* glsl */ `
          varying vec2 vNdc;
          void main() {
            vNdc = position.xy;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uAspect;
          varying vec2 vNdc;
          void main() {
            vec2 p = vec2(vNdc.x * uAspect, vNdc.y);
            float r = length(p);
            if (r <= 0.98) discard;
            gl_FragColor = vec4(0.02, 0.03, 0.05, 1.0);
          }
        `,
      }),
    [],
  )

  useFrame(() => {
    material.uniforms.uAspect.value = stereo.aspect
  })

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.atmosphere - 1} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
