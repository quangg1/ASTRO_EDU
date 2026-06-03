/** GLSL stereographic — tâm nhìn +Y; uAspect = width/height để đĩa tròn trên màn hình. */

export const STEREO_UNIFORMS = /* glsl */ `
uniform mat3 uViewFromWorld;
uniform mat3 uWorldFromView;
uniform float uTanHalfFov;
uniform float uMaxTheta;
uniform float uAspect;
`

/** Plane clip NDC [-1,1]² → tọa độ đĩa đều góc (xoay ngang không bị kéo). */
export const STEREO_ASPECT_FN = /* glsl */ `
vec2 stereoPlane(vec2 clipNdc) {
  return vec2(clipNdc.x * uAspect, clipNdc.y);
}

vec2 clipFromStereo(vec2 p) {
  return vec2(p.x / uAspect, p.y);
}

float stereoRadius(vec2 clipNdc) {
  return length(stereoPlane(clipNdc));
}
`

export const STEREO_SCREEN_VERTEX = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const STEREO_INVERSE_FN = /* glsl */ `
${STEREO_ASPECT_FN}

vec3 viewDirFromNdc(vec2 clipNdc) {
  vec2 p = stereoPlane(clipNdc);
  float r = length(p);
  float t = r * uTanHalfFov;
  float theta = 2.0 * atan(t);
  float phi = atan(p.y, p.x);
  return vec3(sin(theta) * cos(phi), cos(theta), sin(theta) * sin(phi));
}

vec3 worldDirFromNdc(vec2 clipNdc) {
  return normalize(uWorldFromView * viewDirFromNdc(clipNdc));
}

float discEdgeFade(vec2 clipNdc) {
  float r = stereoRadius(clipNdc);
  return 1.0 - smoothstep(0.96, 1.0, r);
}
`

export const STEREO_PROJECT_FN = /* glsl */ `
${STEREO_ASPECT_FN}

vec2 stereographicNdc(vec3 worldPos) {
  vec3 v = uViewFromWorld * normalize(worldPos);
  float cosTheta = clamp(v.y, -1.0, 1.0);
  float theta = acos(cosTheta);
  if (theta > uMaxTheta) return vec2(2.0, 2.0);
  float t = tan(theta * 0.5) / uTanHalfFov;
  float phi = atan(v.z, v.x);
  return clipFromStereo(vec2(t * cos(phi), t * sin(phi)));
}

bool stereographicVisible(vec2 clipNdc) {
  return stereoRadius(clipNdc) <= 1.0;
}
`

export const STEREO_SET_CLIP_POS = /* glsl */ `
  vec2 ndc = stereographicNdc(position);
  if (!stereographicVisible(ndc)) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
  } else {
    gl_Position = vec4(ndc, 0.0, 1.0);
  }
`
