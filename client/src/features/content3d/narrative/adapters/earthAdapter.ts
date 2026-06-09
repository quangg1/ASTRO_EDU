import type { EarthStage, MajorEvent } from '@/features/content3d/earth/lib/earthHistoryTypes'
import { telemetryForEarthStage } from '@/features/content3d/earth/lib/earthStageTelemetry'
import { narrativeVisualForBeatId } from '@/features/content3d/narrative/lib/defaultVisual'
import type {
  NarrativeBeat,
  NarrativeBeatEnvironment,
  NarrativeBeatPanel,
  NarrativeBeatVisual,
  NarrativeMajorEvent,
  PlanetNarrativeBundle,
} from '@/features/content3d/narrative/types'

export function earthStageToBeat(stage: EarthStage, order: number): NarrativeBeat {
  const tel = telemetryForEarthStage(stage.id)

  const visual: NarrativeBeatVisual = {
    globeTint: stage.earthColor,
    atmosphereColor: stage.atmosphereColor ?? '#22d3ee',
    atmosphereThickness: tel.atmosphereThickness,
    waterCoverage: tel.waterCoverage,
    dustOpacity: tel.dustOpacity,
    volcanicGlow: tel.volcanicGlow,
    textureUrl: stage.textureUrl,
  }

  const env: NarrativeBeatEnvironment = {
    confidence: tel.confidence,
    liquidWater: tel.liquidWater,
    volcanism: tel.volcanism,
    surfaceTempMinC: tel.surfaceTempMinC,
    surfaceTempMaxC: tel.surfaceTempMaxC,
    surfacePressureRepresentativePa: tel.surfacePressureRepresentativePa,
    surfacePressureBasis: tel.surfacePressureBasis,
    o2Percent: stage.o2,
    co2Ppm: stage.co2,
    dayLengthHours: tel.dayLengthHours,
    eon: stage.eon,
    era: stage.era,
    period: stage.period,
    epoch: stage.epoch ?? null,
  }

  const panel: NarrativeBeatPanel = {
    descriptionVi: stage.description,
    compareNoteVi: tel.compareNoteVi,
    environmentNoteVi: tel.environmentNoteVi,
    pressureCitationVi: '',
    surfaceTempNoteVi: '',
  }

  return {
    id: stage.id,
    order,
    name: stage.name,
    nameEn: stage.name,
    ageLabelVi: stage.timeDisplay,
    icon: stage.icon,
    accentColor: stage.atmosphereColor ?? stage.earthColor,
    timeMa: stage.time,
    timeMaEnd: stage.minMa,
    panel,
    visual,
    environment: env,
    flags: {
      hasDebris: stage.hasDebris,
      hasMeteorites: stage.hasMeteorites,
      hasMoon: stage.hasMoon,
      isExtinction: stage.isExtinction,
    },
    majorEvents: (stage.majorEvents ?? []).map((e) => ({
      title: e.name,
      summary: e.description ?? '',
      type: e.type,
    })),
    resources: stage.resources,
  }
}

export function beatToEarthStage(beat: NarrativeBeat): EarthStage {
  const e = beat.environment
  return {
    id: beat.id,
    name: beat.name,
    time: beat.timeMa,
    timeDisplay: beat.ageLabelVi,
    maxMa: beat.timeMa,
    minMa: beat.timeMaEnd,
    eon: e.eon ?? 'Đại Hiển Sinh',
    era: e.era ?? null,
    period: e.period ?? null,
    epoch: e.epoch ?? null,
    o2: e.o2Percent ?? 21,
    co2: e.co2Ppm ?? 420,
    dayLength: e.dayLengthHours ?? 24,
    earthColor: beat.visual.globeTint,
    atmosphereColor: beat.visual.atmosphereColor,
    textureUrl: beat.visual.textureUrl,
    hasDebris: beat.flags.hasDebris,
    hasMeteorites: beat.flags.hasMeteorites,
    hasMoon: beat.flags.hasMoon,
    isExtinction: beat.flags.isExtinction,
    description: beat.panel.descriptionVi,
    icon: beat.icon,
    majorEvents: beat.majorEvents.map((ev) => ({
      name: ev.title,
      description: ev.summary,
      type: ev.type as MajorEvent['type'],
    })),
    resources: beat.resources,
    climate: {
      globalTemp: (e.surfaceTempMinC + e.surfaceTempMaxC) / 2,
    },
    continental: {
      oceanCoverage: Math.round(beat.visual.waterCoverage * 100),
    },
  }
}

export function earthStagesToBundle(stages: EarthStage[], entityId: string): PlanetNarrativeBundle {
  return {
    entityId,
    kind: 'earth',
    beats: stages.map((s, i) => earthStageToBeat(s, i + 1)),
    sites: [],
    published: true,
  }
}

export function narrativeToEarthStages(bundle: PlanetNarrativeBundle): EarthStage[] {
  return bundle.beats
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(beatToEarthStage)
}

/** Bổ sung visual mặc định nếu thiếu. */
export function ensureBeatVisual(beat: NarrativeBeat): NarrativeBeat {
  if (beat.visual?.globeTint) return beat
  return { ...beat, visual: { ...narrativeVisualForBeatId(beat.id), ...beat.visual } }
}
