'use client'

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import type { SkyLandscapePackConfig } from '@/features/explore/lib/skyLandscapePack'
import type { SkyViewState } from './skyViewState'
import { viewLandscapeOpacity } from './skyViewState'
import { useStereoScreenUniforms } from './useStereoScreenUniforms'
import {
  STEREO_INVERSE_FN,
  STEREO_SCREEN_VERTEX,
  STEREO_UNIFORMS,
} from './stereographicGlsl'

type Props = {
  texture: THREE.Texture
  pack: SkyLandscapePackConfig
  view: SkyViewState
}

/** Panorama alt-az: đục khi nhìn lên; trong suốt dần chỉ khi kéo xuống dưới chân trời (Stellarium). */
export function LandscapePlane({ texture, pack, view }: Props) {
  const { gl } = useThree()
  const azRot = (pack.angleRotateZDeg * Math.PI) / 180
  const uniforms = useStereoScreenUniforms({
    uMap: { value: texture },
    uDim: { value: pack.brightness },
    uAzRot: { value: azRot },
    uGroundOpacity: { value: 1 },
  })

  useEffect(() => {
    const max = gl.capabilities.getMaxAnisotropy?.() ?? 1
    texture.anisotropy = Math.min(16, max)
  }, [gl, texture])

  useFrame(() => {
    uniforms.uGroundOpacity.value = viewLandscapeOpacity(view)
  })

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        uniforms,
        vertexShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_SCREEN_VERTEX}
        `,
        fragmentShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_INVERSE_FN}
          uniform sampler2D uMap;
          uniform float uDim;
          uniform float uAzRot;
          uniform float uGroundOpacity;
          varying vec2 vNdc;
          const float PI = 3.14159265359;

          void main() {
            float r = stereoRadius(vNdc);
            if (r > 1.0) discard;

            vec3 w = worldDirFromNdc(vNdc);
            float alt = asin(clamp(w.y, -1.0, 1.0));
            if (alt > 0.003) discard;

            float az = atan(w.x, -w.z);
            float u = fract(az / (2.0 * PI) + 0.5 + uAzRot / (2.0 * PI));
            float v = 0.5 + alt / PI;

            vec4 tex = texture2D(uMap, vec2(u, v));
            float alpha = tex.a * discEdgeFade(vNdc) * uGroundOpacity;
            if (alpha < 0.003) discard;
            float dim = 0.5 + 0.5 * uGroundOpacity;
            gl_FragColor = vec4(tex.rgb * uDim * dim, alpha);
          }
        `,
      }),
    [texture, pack.brightness, azRot, uniforms],
  )

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.landscape} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
