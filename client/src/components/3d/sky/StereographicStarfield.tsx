'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { useStereographicUniforms } from './StereographicContext'
import { STEREO_PROJECT_FN, STEREO_UNIFORMS } from './stereographicGlsl'

type Props = {
  geometry: THREE.BufferGeometry
  fovDeg: number
  /** 1 = đêm, 0 = ban ngày */
  nightVisibility?: number
}

export function StereographicStarfield({ geometry, fovDeg, nightVisibility = 1 }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const stereo = useStereographicUniforms()
  const clockRef = useRef(0)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointScale: { value: 2.8 },
      uViewFromWorld: { value: new THREE.Matrix3() },
      uWorldFromView: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 1 },
      uMaxTheta: { value: Math.PI },
      uAspect: { value: 1 },
      uNightVis: { value: 1 },
    }),
    [],
  )

  const vertexShader = useMemo(
    () => /* glsl */ `
      ${STEREO_UNIFORMS}
      ${STEREO_PROJECT_FN}
      attribute float size;
      attribute float opacity;
      attribute float glow;
      attribute float phase;
      attribute vec3 color;
      uniform float uPointScale;
      varying float vOpacity;
      varying float vGlow;
      varying float vPhase;
      varying vec3 vColor;
      void main() {
        vOpacity = opacity;
        vGlow = glow;
        vPhase = phase;
        vColor = color;
        vec2 ndc = stereographicNdc(position);
        if (!stereographicVisible(ndc)) {
          gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          return;
        }
        gl_Position = vec4(ndc, 0.0, 1.0);
        float rim = 1.0 - stereoRadius(ndc) * 0.04;
        float psz = size * uPointScale * rim;
        gl_PointSize = clamp(psz, 0.0, 64.0);
      }
    `,
    [],
  )

  const fragmentShader = useMemo(
    () => /* glsl */ `
      uniform float uTime;
      uniform float uNightVis;
      varying float vOpacity;
      varying float vGlow;
      varying float vPhase;
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r = length(uv) * 2.0;
        if (r > 1.0) discard;
        float core = smoothstep(0.22, 0.0, r);
        float halo = vGlow * smoothstep(0.85, 0.12, r) * 0.5;
        float tw = 0.88 + 0.12 * sin(uTime * (2.2 + vPhase * 0.15) + vPhase);
        float lum = (core * 1.35 + halo) * vOpacity * tw * uNightVis;
        if (lum < 0.003) discard;
        vec3 rgb = vColor * lum;
        gl_FragColor = vec4(rgb, lum);
      }
    `,
    [],
  )

  const syncUniforms = (t: number) => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uTime.value = t
    mat.uniforms.uViewFromWorld.value.copy(stereo.viewFromWorld)
    mat.uniforms.uWorldFromView.value.copy(stereo.worldFromView)
    mat.uniforms.uTanHalfFov.value = stereo.tanHalfFov
    mat.uniforms.uMaxTheta.value = stereo.maxTheta
    mat.uniforms.uAspect.value = stereo.aspect
    mat.uniforms.uPointScale.value = 2.65 + (150 - fovDeg) * 0.018
    mat.uniforms.uNightVis.value = nightVisibility
  }

  useLayoutEffect(() => {
    syncUniforms(clockRef.current)
  }, [stereo, fovDeg, nightVisibility])

  useFrame((state) => {
    clockRef.current = state.clock.elapsedTime
    syncUniforms(clockRef.current)
  })

  return (
    <points geometry={geometry} renderOrder={SKY_RENDER_ORDER.stars} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        {...SKY_SHADER_GLSL1}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </points>
  )
}
