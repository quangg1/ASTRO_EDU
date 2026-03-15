import * as THREE from 'three'

const EARTH_RADIUS = 5

/** Chuyển lat/lng (độ) sang Vector3 trên mặt cầu bán kính radius (dùng chung cho fossil points và fly-to). */
export function latLngToVector3(lat: number, lng: number, radius: number = EARTH_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}
