'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { useStereoScreenUniforms } from './useStereoScreenUniforms'
import {
  STEREO_INVERSE_FN,
  STEREO_SCREEN_VERTEX,
  STEREO_UNIFORMS,
} from './stereographicGlsl'

/** Ô nhiễm sáng + mép chân trời mềm (giữa sky gradient và panorama). */
export function HorizonGlowPlane() {
  const uniforms = useStereoScreenUniforms()

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms,
        vertexShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_SCREEN_VERTEX}
        `,
        fragmentShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_INVERSE_FN}
          varying vec2 vNdc;
          const float PI = 3.14159265359;

          void main() {
            float r = stereoRadius(vNdc);
            if (r > 1.0) discard;

            vec3 w = worldDirFromNdc(vNdc);
            float alt = asin(clamp(w.y, -1.0, 1.0));
            if (alt > 0.35) discard;
            if (alt < -0.12) discard;

            float haze = smoothstep(0.28, -0.04, alt) * smoothstep(-0.55, -0.1, alt);
            float rim = smoothstep(1.0, 0.88, r) * 0.35;
            vec3 lp = vec3(0.14, 0.16, 0.24);
            vec3 warm = vec3(0.22, 0.14, 0.08);
            vec3 col = mix(lp, warm, smoothstep(0.12, -0.05, alt) * 0.45);
            float a = haze * (0.42 + rim) * discEdgeFade(vNdc);
            gl_FragColor = vec4(col * a, a);
          }
        `,
      }),
    [uniforms],
  )

  return (
    <mesh
      renderOrder={SKY_RENDER_ORDER.horizonGlow}
      frustumCulled={false}
      material={material}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
