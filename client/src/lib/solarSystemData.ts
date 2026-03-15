/**
 * Dữ liệu Hệ Mặt Trời – texture có trong public/textures/
 * Kích thước và khoảng cách dùng tỉ lệ hiển thị (không đúng tỉ lệ thật).
 */

export interface PlanetData {
  name: string
  nameVi: string
  texture: string
  radius: number      // bán kính hiển thị (đơn vị 3D)
  distance: number   // khoảng cách từ Mặt Trời (đơn vị 3D)
  period: number     // chu kỳ quỹ đạo (giây) – cho animation
  spinPeriod: number // chu kỳ tự quay quanh trục (giây) – 1 vòng
  tilt?: number      // độ nghiêng trục (độ)
  ringTexture?: string
  ringInner?: number
  ringOuter?: number
  /** Màu đường quỹ đạo (hex) để phân biệt hành tinh */
  orbitColor: string
}

const T = '/textures'

/** Tỉ lệ phóng to hành tinh để dễ nhìn (bán kính × scale) */
const PLANET_SIZE_SCALE = 2.8

export const sunData = {
  name: 'Sun',
  nameVi: 'Mặt Trời',
  texture: `${T}/8k_sun.jpg`,
  radius: 3.2,
}

export const planetsData: PlanetData[] = [
  {
    name: 'Mercury',
    nameVi: 'Sao Thủy',
    texture: `${T}/8k_mercury.jpg`,
    radius: 0.22 * PLANET_SIZE_SCALE,
    distance: 8,
    period: 12,
    spinPeriod: 20,
    orbitColor: '#9e9e9e',
  },
  {
    name: 'Venus',
    nameVi: 'Sao Kim',
    texture: `${T}/8k_venus_surface.jpg`,
    radius: 0.32 * PLANET_SIZE_SCALE,
    distance: 12,
    period: 18,
    spinPeriod: 28,
    orbitColor: '#ffcc80',
  },
  {
    name: 'Earth',
    nameVi: 'Trái Đất',
    texture: `${T}/8k_earth_daymap.jpg`,
    radius: 0.34 * PLANET_SIZE_SCALE,
    distance: 16,
    period: 24,
    spinPeriod: 18,
    orbitColor: '#4db6ac',
  },
  {
    name: 'Mars',
    nameVi: 'Sao Hỏa',
    texture: `${T}/8k_mars.jpg`,
    radius: 0.18 * PLANET_SIZE_SCALE,
    distance: 20,
    period: 30,
    spinPeriod: 20,
    orbitColor: '#e57373',
  },
  {
    name: 'Jupiter',
    nameVi: 'Sao Mộc',
    texture: `${T}/8k_jupiter.jpg`,
    radius: 1.0 * PLANET_SIZE_SCALE,
    distance: 28,
    period: 40,
    spinPeriod: 10,
    orbitColor: '#d4532a',
  },
  {
    name: 'Saturn',
    nameVi: 'Sao Thổ',
    texture: `${T}/8k_saturn.jpg`,
    radius: 0.85 * PLANET_SIZE_SCALE,
    distance: 36,
    period: 55,
    spinPeriod: 12,
    ringTexture: `${T}/8k_saturn_ring_alpha.png`,
    ringInner: 0.5,
    ringOuter: 0.75,
    orbitColor: '#e8a030',
  },
  {
    name: 'Uranus',
    nameVi: 'Sao Thiên Vương',
    texture: `${T}/2k_uranus.jpg`,
    radius: 0.5 * PLANET_SIZE_SCALE,
    distance: 44,
    period: 70,
    spinPeriod: 16,
    orbitColor: '#4dd0e1',
  },
  {
    name: 'Neptune',
    nameVi: 'Sao Hải Vương',
    texture: `${T}/2k_neptune.jpg`,
    radius: 0.48 * PLANET_SIZE_SCALE,
    distance: 52,
    period: 85,
    spinPeriod: 15,
    orbitColor: '#5c6bc0',
  },
]
