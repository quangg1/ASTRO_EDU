/**
 * Danh sách địa danh (thành phố / vùng) để hiển thị nhãn trên quả cầu.
 * Tọa độ hiện tại (lat, lng) dùng cho thời kỳ "hiện đại" (Neogene trở lại, time <= 23 Ma)
 * khi texture trái đất khớp với bản đồ hiện tại.
 */

export interface GeoPlace {
  /** Tên hiển thị (có thể dùng tiếng Việt hoặc tên quốc tế) */
  name: string
  /** Tên tiếng Anh (tùy chọn, cho i18n sau) */
  nameEn?: string
  lat: number
  lng: number
}

/** Các địa danh chính: thành phố / vùng nổi bật, tọa độ hiện tại. */
export const GEO_PLACES: GeoPlace[] = [
  // Bắc Mỹ
  { name: 'Los Angeles', lat: 34.05, lng: -118.24 },
  { name: 'San Francisco', lat: 37.77, lng: -122.42 },
  { name: 'Calgary', lat: 51.05, lng: -114.07 },
  { name: 'Vancouver', lat: 49.28, lng: -123.12 },
  { name: 'Chicago', lat: 41.88, lng: -87.63 },
  { name: 'New York', lat: 40.71, lng: -74.01 },
  { name: 'Washington D.C.', lat: 38.91, lng: -77.04 },
  { name: 'Mexico City', lat: 19.43, lng: -99.13 },
  { name: 'Houston', lat: 29.76, lng: -95.37 },
  { name: 'Miami', lat: 25.76, lng: -80.19 },
  // Nam Mỹ
  { name: 'Bogotá', lat: 4.71, lng: -74.07 },
  { name: 'Lima', lat: -12.05, lng: -77.04 },
  { name: 'Rio de Janeiro', lat: -22.91, lng: -43.17 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63 },
  { name: 'Buenos Aires', lat: -34.6, lng: -58.38 },
  { name: 'Santiago', lat: -33.45, lng: -70.67 },
  // Châu Âu
  { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'Paris', lat: 48.86, lng: 2.35 },
  { name: 'Berlin', lat: 52.52, lng: 13.4 },
  { name: 'Madrid', lat: 40.42, lng: -3.7 },
  { name: 'Rome', lat: 41.9, lng: 12.5 },
  { name: 'Moscow', lat: 55.76, lng: 37.62 },
  { name: 'Istanbul', lat: 41.01, lng: 28.95 },
  // Châu Phi
  { name: 'Lagos', lat: 6.45, lng: 3.39 },
  { name: 'Kinshasa', lat: -4.44, lng: 15.27 },
  { name: 'Johannesburg', lat: -26.2, lng: 28.04 },
  { name: 'Cairo', lat: 30.04, lng: 31.24 },
  { name: 'Nairobi', lat: -1.29, lng: 36.82 },
  // Châu Á
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'Beijing', lat: 39.9, lng: 116.41 },
  { name: 'Shanghai', lat: 31.23, lng: 121.47 },
  { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  { name: 'Delhi', lat: 28.61, lng: 77.21 },
  { name: 'Bangkok', lat: 13.76, lng: 100.5 },
  { name: 'Singapore', lat: 1.29, lng: 103.85 },
  { name: 'Jakarta', lat: -6.21, lng: 106.85 },
  { name: 'Seoul', lat: 37.57, lng: 126.98 },
  // Châu Đại Dương
  { name: 'Sydney', lat: -33.87, lng: 151.21 },
  { name: 'Melbourne', lat: -37.81, lng: 144.96 },
  { name: 'Auckland', lat: -36.85, lng: 174.76 },
]
