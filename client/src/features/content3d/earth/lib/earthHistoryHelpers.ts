import type { EarthStage } from '@/features/content3d/earth/lib/earthHistoryTypes'

/**
 * Find the stage whose `time` is closest to the requested Ma marker.
 * - Exact match wins.
 * - Otherwise, the stage within tolerance (10% of `time`, min 0.5 Ma) wins.
 * - Returns `undefined` if no stage is within tolerance.
 */
export function findStageByTime(stages: EarthStage[], time: number): EarthStage | undefined {
  const exact = stages.find((s) => s.time === time)
  if (exact) return exact
  const tolerance = time >= 1 ? time * 0.1 : 0.5
  return stages.find((s) => Math.abs(s.time - time) <= tolerance)
}

export function findStageById(stages: EarthStage[], id: number): EarthStage | undefined {
  return stages.find((s) => s.id === id)
}
