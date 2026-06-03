import { STEREO_PROJECT_FN, STEREO_UNIFORMS } from './stereographicGlsl'

export const landscapeSphereVertexShader = /* glsl */ `
${STEREO_UNIFORMS}
uniform mat3 uWorldFromView;
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
`

export const landscapeSphereFragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uDim;
uniform float uAzRot;
varying vec3 vWorldDir;

const float PI = 3.14159265359;

void main() {
  float alt = asin(clamp(vWorldDir.y, -1.0, 1.0));
  if (alt > 0.003) discard;

  float az = atan(vWorldDir.x, -vWorldDir.z);
  float u = az / (2.0 * PI) + 0.5 + uAzRot / (2.0 * PI);
  u -= floor(u);
  float v = 0.5 + alt / PI;

  vec4 tex = texture2D(uMap, vec2(u, v));
  float alpha = tex.a;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(tex.rgb * uDim, alpha);
}
`
