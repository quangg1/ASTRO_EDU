'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SunSkyState } from '@/features/explore/lib/skyAstronomy'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { useStereoScreenUniforms } from './useStereoScreenUniforms'
import {
  STEREO_INVERSE_FN,
  STEREO_SCREEN_VERTEX,
  STEREO_UNIFORMS,
} from './stereographicGlsl'

type Props = { sun: SunSkyState }

/**
 * Bầu trời 100% fragment (không sphere) — gradient theo độ cao, mép đĩa mượt.
 */
export function SkyAtmospherePlane({ sun }: Props) {
  const sunUniforms = useMemo(
    () => ({
      uSunAlt: { value: sun.altDeg },
      uDay: { value: sun.dayFactor },
    }),
    [sun.altDeg, sun.dayFactor],
  )
  const uniforms = useStereoScreenUniforms(sunUniforms)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        depthWrite: false,
        depthTest: false,
        uniforms,
        vertexShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_SCREEN_VERTEX}
        `,
        fragmentShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_INVERSE_FN}
          uniform float uSunAlt;
          uniform float uDay;
          varying vec2 vNdc;

          void main() {
            float r = stereoRadius(vNdc);
            if (r > 1.0) discard;

            vec3 w = worldDirFromNdc(vNdc);
            float alt = asin(clamp(w.y, -1.0, 1.0));
            if (alt < -0.01) discard;

            float t = max(alt, 0.0) / 1.5708;

            vec3 horizon = vec3(0.07, 0.11, 0.20);
            vec3 zenith = vec3(0.015, 0.025, 0.055);
            if (uSunAlt < -12.0) {
              horizon = vec3(0.06, 0.09, 0.16);
              zenith = vec3(0.008, 0.012, 0.028);
            } else if (uSunAlt < 6.0) {
              float tw = clamp((uSunAlt + 12.0) / 18.0, 0.0, 1.0);
              horizon = mix(horizon, vec3(0.18, 0.12, 0.10), tw * 0.5);
            } else {
              horizon = mix(horizon, vec3(0.15, 0.22, 0.35), uDay * 0.6);
              zenith = mix(zenith, vec3(0.04, 0.08, 0.18), uDay * 0.5);
            }

            vec3 col = mix(horizon, zenith, pow(t, 0.75));
            float altDeg = alt * 57.2958;
            float lpGlow = smoothstep(18.0, 0.0, altDeg) * smoothstep(-2.0, 4.0, altDeg);
            vec3 pollution = vec3(0.11, 0.13, 0.21);
            col = mix(col, pollution, lpGlow * 0.55);
            col += vec3(0.02, 0.03, 0.05) * smoothstep(0.0, 0.15, alt) * (1.0 - smoothstep(0.45, 1.0, alt));
            col *= discEdgeFade(vNdc);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [uniforms],
  )

  useFrame(() => {
    uniforms.uSunAlt.value = sun.altDeg
    uniforms.uDay.value = sun.dayFactor
  })

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.atmosphere} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
