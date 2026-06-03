'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getStarPointTexture } from './skyVisuals'
import { SKY_RENDER_ORDER } from './skyLayers'

type Props = {
  geometry: THREE.BufferGeometry
}

export function StarfieldPoints({ geometry }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const starMap = useMemo(() => getStarPointTexture(), [])

  const uniforms = useMemo(
    () => ({
      uMap: { value: starMap },
      uBaseSize: { value: 3.2 },
    }),
    [starMap],
  )

  useFrame(({ camera }) => {
    if (matRef.current) {
      matRef.current.uniforms.uBaseSize.value =
        1.8 * ((camera as THREE.PerspectiveCamera).fov || 60) / 60
    }
  })

  return (
    <points geometry={geometry} renderOrder={SKY_RENDER_ORDER.stars}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          attribute float size;
          attribute float opacity;
          attribute vec3 color;
          varying float vOpacity;
          varying vec3 vColor;
          uniform float uBaseSize;
          void main() {
            vOpacity = opacity;
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * uBaseSize * (280.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          uniform sampler2D uMap;
          varying float vOpacity;
          varying vec3 vColor;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            if (length(uv) > 0.5) discard;
            vec4 tex = texture2D(uMap, gl_PointCoord);
            gl_FragColor = vec4(vColor * tex.rgb, tex.a * vOpacity);
          }
        `}
      />
    </points>
  )
}
