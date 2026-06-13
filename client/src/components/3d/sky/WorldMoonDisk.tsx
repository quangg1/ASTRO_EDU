'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MoonIllumination } from '@/features/explore/lib/skyMoonPhase'
import { shouldShowMoonDisk } from '@/features/explore/lib/skyMoonPhase'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { useStereographicUniforms } from './StereographicContext'
import { STEREO_PROJECT_FN, STEREO_UNIFORMS } from './stereographicGlsl'

type Props = {
  position: [number, number, number]
  moonAltDeg: number
  sunAltDeg: number
  moonPhase: MoonIllumination
  active?: boolean
  onClick?: () => void
}

/** Mặt Trăng ban đêm — trên thiên cầu, xoay theo hướng nhìn (như sao). */
export function WorldMoonDisk({
  position,
  moonAltDeg,
  sunAltDeg,
  moonPhase,
  active,
  onClick,
}: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const stereo = useStereographicUniforms()
  const size = active ? 28 : 24
  const opacity =
    shouldShowMoonDisk(sunAltDeg, moonAltDeg) ? Math.min(1, moonAltDeg / 8) * (active ? 1 : 0.92) : 0

  const uniforms = useMemo(
    () => ({
      uOpacity: { value: opacity },
      uSize: { value: size },
      uAnchor: { value: new THREE.Vector3(...position) },
      uPhaseFrac: { value: moonPhase.phaseFraction },
      uPhaseAngle: { value: (moonPhase.phaseAngleDeg * Math.PI) / 180 },
      uViewFromWorld: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 1 },
      uMaxTheta: { value: Math.PI },
      uAspect: { value: 1 },
    }),
    [opacity, size, position, moonPhase.phaseFraction, moonPhase.phaseAngleDeg],
  )

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uViewFromWorld.value.copy(stereo.viewFromWorld)
    mat.uniforms.uTanHalfFov.value = stereo.tanHalfFov
    mat.uniforms.uMaxTheta.value = stereo.maxTheta
    mat.uniforms.uAspect.value = stereo.aspect
    mat.uniforms.uAnchor.value.set(position[0], position[1], position[2])
    mat.uniforms.uOpacity.value = opacity
  })

  if (!shouldShowMoonDisk(sunAltDeg, moonAltDeg) || opacity < 0.04) return null

  return (
    <mesh
      renderOrder={SKY_RENDER_ORDER.sunMoon}
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
          uniform float uOpacity;
          uniform float uPhaseFrac;
          uniform float uPhaseAngle;
          varying vec2 vUv;
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            float r = length(p);
            if (r > 1.0) discard;
            float ca = cos(uPhaseAngle);
            float sa = sin(uPhaseAngle);
            vec2 pr = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);
            float f = clamp(uPhaseFrac, 0.0, 1.0);
            float lit = 0.0;
            if (f <= 0.02) lit = 0.0;
            else if (f >= 0.98) lit = 1.0;
            else if (f < 0.5) {
              float edge = 1.0 - f * 2.0;
              float x = pr.x / max(0.15, sqrt(1.0 - pr.y * pr.y));
              lit = smoothstep(edge - 0.06, edge + 0.04, x);
            } else {
              float edge = f * 2.0 - 1.0;
              float x = pr.x / max(0.15, sqrt(1.0 - pr.y * pr.y));
              lit = 1.0 - smoothstep(edge - 0.04, edge + 0.06, -x);
            }
            float n = hash(p * 9.0) * 0.06;
            vec3 col = mix(vec3(0.03, 0.035, 0.05), vec3(0.9, 0.89, 0.84) * (0.94 + n), lit);
            float a = smoothstep(1.0, 0.88, r) * uOpacity * mix(0.15, 1.0, lit + 0.05);
            gl_FragColor = vec4(col, a);
          }
        `}
      />
    </mesh>
  )
}
