import * as THREE from 'three'

/** Sky shaders dùng GLSL1 (`attribute` / `texture2D`) — tránh lỗi compile trên WebGL2. */
export const SKY_SHADER_GLSL1 = { glslVersion: THREE.GLSL1 } as const

/**
 * Thứ tự vẽ bầu trời (Stellarium) — edu scope:
 * 1 atmosphere, 2 Milky Way, (3 DSO bỏ), 4 stars, 5 planets, 6 grid+lines, 7 landscape.
 */

export const SKY_RENDER_ORDER = {
  atmosphere: 0,
  horizonGlow: 1,
  milkyWay: 2,
  deepSky: 3,
  stars: 4,
  planets: 5,
  grid: 6,
  constellationLines: 7,
  /** Sau sao/hành tinh — cây che sao sát chân trời (Stellarium). */
  landscape: 9,
} as const

/** Lưới Alt-Az kiểu Stellarium (cam). */
export const SKY_GRID_COLOR = '#b06030'
