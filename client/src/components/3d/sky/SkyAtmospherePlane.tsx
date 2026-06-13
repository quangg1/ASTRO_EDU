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
 * Bầu trời gradient theo độ cao thực (world-space) — khớp landscape, không hở nền đen.
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
            if (alt < -0.025) discard;

            float t = max(alt, 0.0) / 1.5708;

            vec3 nightHorizon = vec3(0.07, 0.11, 0.20);
            vec3 nightZenith = vec3(0.015, 0.025, 0.055);
            vec3 dayHorizon = vec3(0.78, 0.86, 0.94);
            vec3 dayZenith = vec3(0.38, 0.58, 0.90);
            vec3 horizon = nightHorizon;
            vec3 zenith = nightZenith;

            if (uSunAlt < -12.0) {
              horizon = vec3(0.06, 0.09, 0.18);
              zenith = vec3(0.02, 0.03, 0.07);
            } else if (uSunAlt < 6.0) {
              float tw = clamp((uSunAlt + 12.0) / 18.0, 0.0, 1.0);
              horizon = mix(nightHorizon, vec3(0.42, 0.30, 0.28), tw * 0.88);
              zenith = mix(nightZenith, vec3(0.14, 0.20, 0.34), tw * 0.78);
              float dusk = smoothstep(6.0, -2.0, uSunAlt);
              horizon += vec3(0.18, 0.08, 0.04) * dusk * smoothstep(0.0, 0.22, t);
            } else {
              horizon = mix(nightHorizon, dayHorizon, uDay);
              zenith = mix(nightZenith, dayZenith, uDay);
            }

            vec3 col = mix(horizon, zenith, pow(t, 0.72));
            float altDeg = alt * 57.2958;
            float lpGlow = smoothstep(18.0, 0.0, altDeg) * smoothstep(-2.0, 4.0, altDeg) * (1.0 - uDay);
            vec3 pollution = vec3(0.11, 0.13, 0.21);
            col = mix(col, pollution, lpGlow * 0.55);
            col += vec3(0.02, 0.03, 0.05) * smoothstep(0.0, 0.15, alt) * (1.0 - smoothstep(0.45, 1.0, alt)) * (1.0 - uDay * 0.92);
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
