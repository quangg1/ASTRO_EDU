import type { Dispatch, SetStateAction } from 'react'
import type { ShowcaseGamificationStrip } from '@/components/3d/showcase/ShowcaseEntityPanel'
import type { ShowcaseCameraSpherical } from '@/components/3d/showcase/ShowcaseCameraManager'
import type { ShowcaseEntityContentDTO, ShowcaseJplOrbitDTO } from '@/features/content3d/showcase/public'
import type { ResolvedNasaCatalogItem } from '@/lib/mergeShowcaseCatalog'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import type { LearningConcept } from '@/data/learningPathCurriculum'
import type { LessonVisited3DMap } from '@/features/learning-path/public'
import type { QuizQuestion } from '@/shared/types/quizQuestion'

export type ExploreSceneMode = 'earth' | 'planet-history' | 'showcase'

export type ExploreLessonLink = { lessonId: string; title: string; href: string }

export type ExploreShowcaseCatalogSlice = {
  showcaseContent: ShowcaseEntityContentDTO[]
  jplOrbits: ShowcaseJplOrbitDTO[]
  resolvedCatalog: ResolvedNasaCatalogItem[]
  mergedOrbitEntities: ShowcaseOrbitEntity[]
  planetGlobeEntity: ReturnType<typeof import('@/lib/mergeShowcaseCatalog').buildPlanetGlobeEntity> | null
  planetHistoryLabel: string
  activeResolved: ResolvedNasaCatalogItem | null
  activeOrbitEntity: ShowcaseOrbitEntity | null
  activeContentRow: ShowcaseEntityContentDTO | null
  showcasePlanetsMoons: ResolvedNasaCatalogItem[]
  showcaseDwarfPlanets: ResolvedNasaCatalogItem[]
  showcaseComets: ResolvedNasaCatalogItem[]
  showcaseSpacecraft: ResolvedNasaCatalogItem[]
  museumLabelVi: string
}

export type ExploreLearningBridgeSlice = {
  bridgeDebugOn: boolean
  bridgeDebugEntries: string[]
  pushBridgeDebug: (msg: string) => void
  bridgeQuizPromptOpen: boolean
  setBridgeQuizPromptOpen: (open: boolean) => void
  bridgeQuizQuestions: QuizQuestion[]
  handleQuizComplete: (result: { correct: number; total: number; allCorrect: boolean }) => void
  effectiveConceptCards: LearningConcept[]
  effectiveLessonLinks: ExploreLessonLink[]
  bridgeVisitedLessonsForEntity: number
  visited3DMap: LessonVisited3DMap
}

export type ExploreRewardsSlice = {
  gemBalance: number
  gamificationStrip: ShowcaseGamificationStrip | null
}

export type ExploreModeSlice = {
  sceneMode: ExploreSceneMode
  earthHistoryOpen: boolean
  setEarthHistoryOpen: (open: boolean) => void
  planetHistoryOpen: boolean
  planetHistoryEntityId: string | null
  planetHistoryLabel: string
  openPlanetHistory: (entityId: string, focus?: { beatId?: number; pinId?: string }) => void
  closePlanetHistory: () => void
  showcaseMenuOpen: boolean
  setShowcaseMenuOpen: Dispatch<SetStateAction<boolean>>
  showcaseActiveItemId: string
  selectedSolarPlanetIndex: number | null
  setSelectedSolarPlanetIndex: (idx: number | null) => void
  planetAccent: string
  planetHistoryLessonLinks: ExploreLessonLink[]
}

export type ExploreShowcaseNavSlice = {
  initialShowcaseSpherical: ShowcaseCameraSpherical | null
  handleShowcaseEntityClicked: (entityId: string, source: string) => void
  syncSelectedPlanetFromItem: (entityId: string) => void
  handleShowcaseCameraSettled: (sph: ShowcaseCameraSpherical) => void
}
