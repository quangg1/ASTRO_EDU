'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sunScreenNdc } from '@/features/explore/lib/skyTimeMode'
import type { SunSkyState } from '@/features/explore/lib/skyAstronomy'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { STEREO_ASPECT_FN } from './stereographicGlsl'

type Props = {
  sun: SunSkyState
  cloudCoverPct?: number
  active?: boolean
  onClick?: () => void
}

/** Mặt Trời cố định trên màn hình theo alt/az thời gian — không xoay theo camera. */
export function ScreenSunDisk({ sun, cloudCoverPct = 0, active, onClick }: Props) {
  const { size } = useThree()
  const cloudDim = 1 - Math.min(0.65, (cloudCoverPct / 100) * 0.55)
  const diskSize = active ? 0.14 : 0.12
  const opacity = Math.min(1, sun.altDeg / 5) * cloudDim * (active ? 1 : 0.94)

  const uniformsRef = useRef({
    uCenter: { value: new THREE.Vector2(2, 2) },
    uSize: { value: diskSize },
    uOpacity: { value: opacity },
    uAspect: { value: 1 },
  })

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: uniformsRef.current,
        vertexShader: /* glsl */ `
          varying vec2 vNdc;
          void main() {
            vNdc = position.xy;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          ${STEREO_ASPECT_FN}
          uniform vec2 uCenter;
          uniform float uSize;
          uniform float uOpacity;
          varying vec2 vNdc;

          void main() {
            if (stereoRadius(vNdc) > 1.0) discard;
            vec2 p = stereoPlane(vNdc - uCenter) / uSize;
            float r = length(p);
            if (r > 1.15) discard;

            float core = exp(-r * r * 14.0);
            float disk = smoothstep(0.42, 0.28, r);
            float corona = exp(-r * 1.6) * 0.45;
            vec3 col = mix(vec3(1.0, 0.78, 0.38), vec3(1.0, 0.95, 0.85), core);
            float a = (disk * 0.95 + corona + core * 0.35) * uOpacity;
            if (a < 0.02) discard;
            gl_FragColor = vec4(col, a);
          }
        `,
      }),
    [],
  )

  useFrame(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const pos = sunScreenNdc(sun.altDeg, sun.azDeg, aspect)
    uniformsRef.current.uCenter.value.set(pos.x, pos.y)
    uniformsRef.current.uSize.value = diskSize
    uniformsRef.current.uOpacity.value = opacity
    uniformsRef.current.uAspect.value = aspect
  })

  if (sun.altDeg <= 0.5 || opacity < 0.03) return null

  return (
    <mesh
      renderOrder={SKY_RENDER_ORDER.sunMoon}
      frustumCulled={false}
      material={material}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation()
              onClick()
            }
          : undefined
      }
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
