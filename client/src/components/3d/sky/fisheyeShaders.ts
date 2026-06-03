/** Stereographic all-sky — hướng nhìn (view) ở tâm đĩa, quay 3D quanh observer. */

export const fisheyeDisplayVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const fisheyeDisplayFragmentShader = /* glsl */ `
uniform samplerCube uCube;
uniform float uFovDeg;
uniform mat3 uWorldFromView;
varying vec2 vUv;

const float PI = 3.14159265359;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) {
    gl_FragColor = vec4(0.03, 0.05, 0.04, 1.0);
    return;
  }

  float maxTheta = radians(uFovDeg * 0.5);
  float t = r * tan(maxTheta * 0.5);
  float theta = 2.0 * atan(t);
  float phi = atan(p.y, p.x);

  vec3 offsetDir;
  offsetDir.x = sin(theta) * cos(phi);
  offsetDir.y = cos(theta);
  offsetDir.z = sin(theta) * sin(phi);

  vec3 worldDir = uWorldFromView * offsetDir;
  vec3 sampleDir = vec3(worldDir.x, worldDir.y, -worldDir.z);

  vec4 col = textureCube(uCube, sampleDir);
  float edge = smoothstep(0.94, 1.0, r);
  col.rgb *= 1.0 - edge * 0.12;
  gl_FragColor = col;
}
`
