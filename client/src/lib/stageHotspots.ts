export type StageHotspot = {
  id: string
  label: string
  lat: number
  lng: number
  minMa?: number
  maxMa?: number
}

/**
 * Các hotspot mẫu cho Earth History (phase đầu).
 * Sau này có thể migrate sang NarrativeSpace beat.assetRefs.
 */
export const STAGE_HOTSPOTS: StageHotspot[] = [
  { id: 'lhb-impact-basin', label: 'Impact Basin', lat: 28, lng: -35, minMa: 3800, maxMa: 4200 },
  { id: 'cyanobacteria-coast', label: 'Cyanobacteria Coast', lat: -18, lng: 142, minMa: 2800, maxMa: 3600 },
  { id: 'great-oxygenation', label: 'Great Oxygenation', lat: 10, lng: 40, minMa: 2200, maxMa: 2600 },
  { id: 'permian-extinction', label: 'Permian Crisis', lat: 61, lng: 70, minMa: 240, maxMa: 270 },
  { id: 'cretaceous-impact', label: 'Chicxulub Region', lat: 21, lng: -89, minMa: 60, maxMa: 70 },
  { id: 'modern-tech', label: 'Anthropocene Hubs', lat: 35, lng: 100, minMa: 0, maxMa: 1 },
]

export function getHotspotsForTime(timeMa: number): StageHotspot[] {
  return STAGE_HOTSPOTS.filter((h) => {
    const min = h.minMa ?? Number.NEGATIVE_INFINITY
    const max = h.maxMa ?? Number.POSITIVE_INFINITY
    return timeMa >= min && timeMa <= max
  })
}
