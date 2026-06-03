/** Landscape Stellarium: spherical equirect + alpha + xoay azimuth. */

export const landscapeVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const landscapeFragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uDim;
uniform float uNadirFade;
varying vec2 vUv;

void main() {
  vec4 tex = texture2D(uMap, vUv);
  vec3 rgb = tex.rgb * uDim;
  float alpha = tex.a * (1.0 - uNadirFade);
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(rgb, alpha);
}
`
