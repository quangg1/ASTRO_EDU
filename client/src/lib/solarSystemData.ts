/**
 * Dữ liệu Hệ Mặt Trời – texture có trong public/textures/
 * Kích thước và khoảng cách dùng tỉ lệ hiển thị (không đúng tỉ lệ thật).
 */

export interface PlanetData {
  name: string
  nameVi: string
  /** Short English blurb for astronaut / pilot HUD */
  explorerBlurb: string
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
  /** Eccentricity for elliptical orbit visualization */
  orbitEccentricity?: number
  /** Inclination in degrees (against base ecliptic plane) */
  orbitInclinationDeg?: number
  /** Longitude of ascending node in degrees */
  orbitAscendingNodeDeg?: number
  /** Initial phase offset in degrees for per-planet placement */
  orbitPhaseDeg?: number
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
    explorerBlurb: 'Sun-blasted, cratered world — the smallest planet and a stark first stop.',
    texture: `${T}/8k_mercury.jpg`,
    radius: 0.22 * PLANET_SIZE_SCALE,
    distance: 10,
    period: 12,
    spinPeriod: 20,
    orbitColor: '#9e9e9e',
    orbitEccentricity: 0.206,
    orbitInclinationDeg: 7.0,
    orbitAscendingNodeDeg: 48.3,
    orbitPhaseDeg: 32,
  },
  {
    name: 'Venus',
    nameVi: 'Sao Kim',
    explorerBlurb: 'Thick clouds, crushing pressure, and furnace-like heat — Earth’s “evil twin”.',
    // NASA-3D-Resources texture (uploaded to CDN via /textures/nasa/*)
    texture: `${T}/nasa/venus_nasa.jpg`,
    radius: 0.32 * PLANET_SIZE_SCALE,
    distance: 15,
    period: 18,
    spinPeriod: 28,
    orbitColor: '#ffcc80',
    orbitEccentricity: 0.007,
    orbitInclinationDeg: 3.4,
    orbitAscendingNodeDeg: 76.7,
    orbitPhaseDeg: 140,
  },
  {
    name: 'Earth',
    nameVi: 'Trái Đất',
    explorerBlurb: 'Our blue world — oceans, atmosphere, and the only known life in the solar system.',
    texture: `${T}/8k_earth_daymap.jpg`,
    radius: 0.34 * PLANET_SIZE_SCALE,
    distance: 21,
    period: 24,
    spinPeriod: 18,
    orbitColor: '#4db6ac',
    orbitEccentricity: 0.017,
    orbitInclinationDeg: 0.0,
    orbitAscendingNodeDeg: -11.2,
    orbitPhaseDeg: 215,
  },
  {
    name: 'Mars',
    nameVi: 'Sao Hỏa',
    explorerBlurb: 'Rusty deserts, giant volcanoes, and polar ice — humanity’s next frontier.',
    // NASA-3D-Resources texture (uploaded to CDN via /textures/nasa/*)
    texture: `${T}/nasa/mars_nasa.jpg`,
    radius: 0.18 * PLANET_SIZE_SCALE,
    distance: 30,
    period: 30,
    spinPeriod: 20,
    orbitColor: '#e57373',
    orbitEccentricity: 0.093,
    orbitInclinationDeg: 1.85,
    orbitAscendingNodeDeg: 49.6,
    orbitPhaseDeg: 70,
  },
  {
    name: 'Jupiter',
    nameVi: 'Sao Mộc',
    explorerBlurb: 'The largest planet — a stormy gas giant with the Great Red Spot.',
    // NASA-3D-Resources texture (uploaded to CDN via /textures/nasa/*)
    texture: `${T}/nasa/jupiter_nasa.jpg`,
    radius: 1.0 * PLANET_SIZE_SCALE,
    distance: 44,
    period: 40,
    spinPeriod: 10,
    orbitColor: '#d4532a',
    orbitEccentricity: 0.049,
    orbitInclinationDeg: 1.3,
    orbitAscendingNodeDeg: 100.5,
    orbitPhaseDeg: 8,
  },
  {
    name: 'Saturn',
    nameVi: 'Sao Thổ',
    explorerBlurb: 'Iconic rings of ice and rock orbiting a pale gas giant.',
    // NASA-3D-Resources texture (uploaded to CDN via /textures/nasa/*)
    texture: `${T}/nasa/saturn_nasa.jpg`,
    radius: 0.85 * PLANET_SIZE_SCALE,
    distance: 60,
    period: 55,
    spinPeriod: 12,
    ringTexture: `${T}/8k_saturn_ring_alpha.png`,
    ringInner: 0.5,
    ringOuter: 0.75,
    orbitColor: '#e8a030',
    orbitEccentricity: 0.056,
    orbitInclinationDeg: 2.5,
    orbitAscendingNodeDeg: 113.7,
    orbitPhaseDeg: 312,
  },
  {
    name: 'Uranus',
    nameVi: 'Sao Thiên Vương',
    explorerBlurb: 'An ice giant tilted on its side, with a smooth blue-green haze.',
    texture: `${T}/2k_uranus.jpg`,
    radius: 0.5 * PLANET_SIZE_SCALE,
    distance: 78,
    period: 70,
    spinPeriod: 16,
    orbitColor: '#4dd0e1',
    orbitEccentricity: 0.047,
    orbitInclinationDeg: 0.77,
    orbitAscendingNodeDeg: 74.0,
    orbitPhaseDeg: 190,
  },
  {
    name: 'Neptune',
    nameVi: 'Sao Hải Vương',
    explorerBlurb: 'Deep blue, wind-whipped ice giant — the farthest major planet from the Sun.',
    // NASA-3D-Resources texture (uploaded to CDN via /textures/nasa/*)
    texture: `${T}/nasa/neptune_nasa.jpg`,
    radius: 0.48 * PLANET_SIZE_SCALE,
    distance: 96,
    period: 85,
    spinPeriod: 15,
    orbitColor: '#5c6bc0',
    orbitEccentricity: 0.009,
    orbitInclinationDeg: 1.77,
    orbitAscendingNodeDeg: 131.8,
    orbitPhaseDeg: 265,
  },
]
