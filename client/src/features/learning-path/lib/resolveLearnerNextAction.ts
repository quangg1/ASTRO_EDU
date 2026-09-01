import { getLessonById, type LearningModule } from '@/features/learning-path/data/learningPathCurriculum'
import type { EduJourneyContext } from '@/lib/eduJourney'
import type { OnboardingIntentId } from '@/features/onboarding/public'
import { suggestExploreTargetsForLesson } from '@/features/content3d/showcase/public'
import {
  buildLearningJourneyGuardrail,
  type JourneyGuardrailRecommendation,
} from './learningJourneyGuardrails'
import type { LessonCompletionMap } from './learningPathProgress'

export type LearnerNextActionKind =
  | 'start_lesson'
  | 'continue_lesson'
  | 'review'
  | 'explore_entity'
  | 'open_sky'
  | 'open_community'

export type LearnerNextActionLink = {
  title: string
  href: string
  ctaLabel?: string
}

export type LearnerNextAction = {
  kind: LearnerNextActionKind
  title: string
  reason: string
  href: string
  ctaLabel: string
  lessonId?: string
  lessonTitle?: string
  hasProgress: boolean
  secondary?: LearnerNextActionLink
}

export type ResolveLearnerNextActionInput = {
  modules: LearningModule[]
  completionMap: LessonCompletionMap
  lastLessonId?: string | null
  intent?: OnboardingIntentId | null
  /** Onboarding primaryHref — chỉ dùng khi intent lệch khỏi LP spine. */
  primaryHref?: string | null
  eduJourney?: EduJourneyContext | null
}

function kindFromGuardrail(status: JourneyGuardrailRecommendation['status']): LearnerNextActionKind {
  if (status === 'start') return 'start_lesson'
  if (status === 'review') return 'review'
  return 'continue_lesson'
}

function ctaFromKind(kind: LearnerNextActionKind, hasProgress: boolean): string {
  if (kind === 'explore_entity') return 'Khám phá 3D'
  if (kind === 'open_sky') return 'Mở bầu trời'
  if (kind === 'open_community') return 'Vào diễn đàn'
  if (kind === 'review') return 'Ôn lại'
  return hasProgress ? 'Tiếp tục học' : 'Bắt đầu hành trình'
}

function lessonSecondaryFromGuardrail(g: JourneyGuardrailRecommendation): LearnerNextActionLink | undefined {
  if (!g.href) return undefined
  return {
    title: g.lessonTitle || g.title,
    href: g.href,
    ctaLabel: g.status === 'start' ? 'Bắt đầu học' : 'Tiếp tục lộ trình',
  }
}

function exploreSecondaryForLesson(
  modules: LearningModule[],
  lessonId?: string | null,
): LearnerNextActionLink | undefined {
  if (!lessonId) return undefined
  const hit = getLessonById(lessonId, modules)
  if (!hit) return undefined
  const targets = suggestExploreTargetsForLesson(hit.lesson)
  const target = targets.showcase || targets.history
  if (!target) return undefined
  return {
    title: 'Xem trên Explore 3D',
    href: target.href,
    ctaLabel: 'Khám phá 3D',
  }
}

/**
 * Single next-best-action cho Dashboard / Tutorial / Explore.
 * LP là xương sống; intent onboarding chỉ đổi ưu tiên primary khi chưa có tiến độ LP.
 */
export function resolveLearnerNextAction(input: ResolveLearnerNextActionInput): LearnerNextAction {
  const {
    modules,
    completionMap,
    lastLessonId,
    intent,
    primaryHref,
    eduJourney,
  } = input

  const completedCount = Object.values(completionMap).filter(Boolean).length
  const hasProgress = completedCount > 0 || Boolean(lastLessonId)
  const guardrail = buildLearningJourneyGuardrail(modules, completionMap, lastLessonId)

  const lpHref = guardrail.href || '/tutorial'

  const lpPrimary: LearnerNextAction = {
    kind: kindFromGuardrail(guardrail.status),
    title: guardrail.lessonTitle || guardrail.title,
    reason: eduJourney?.entityLabel
      ? `Đang nối từ ${eduJourney.entityLabel}. ${guardrail.reason}`
      : guardrail.reason,
    href: lpHref,
    ctaLabel: ctaFromKind(kindFromGuardrail(guardrail.status), hasProgress),
    lessonId: guardrail.lessonId,
    lessonTitle: guardrail.lessonTitle,
    hasProgress,
    secondary: exploreSecondaryForLesson(modules, guardrail.lessonId) ||
      (eduJourney?.exploreHref
        ? { title: 'Quay lại Explore', href: eduJourney.exploreHref, ctaLabel: 'Mở Explore' }
        : { title: 'Khám phá 3D', href: '/explore', ctaLabel: 'Mở Explore' }),
  }

  // Có tiến độ LP → luôn spine LP (intent không tranh primary).
  if (hasProgress) return lpPrimary

  const resolvedIntent = intent || 'mixed'

  if (resolvedIntent === 'explore_3d') {
    const exploreHref =
      primaryHref?.includes('/explore')
        ? primaryHref
        : eduJourney?.exploreHref || '/explore?view=solar&entity=planet-earth'
    return {
      kind: 'explore_entity',
      title: 'Khám phá hệ Mặt Trời 3D',
      reason: 'Bạn chọn bắt đầu bằng khám phá. Sau khi xem một thiên thể, hãy mở bài học liên quan trên lộ trình.',
      href: exploreHref,
      ctaLabel: ctaFromKind('explore_entity', false),
      hasProgress: false,
      secondary: lessonSecondaryFromGuardrail(guardrail),
    }
  }

  if (resolvedIntent === 'stargazing') {
    const skyHref =
      primaryHref?.includes('view=sky') || primaryHref?.includes('/explore')
        ? primaryHref
        : '/explore?view=sky'
    return {
      kind: 'open_sky',
      title: 'Mở la bàn bầu trời',
      reason: 'Quan sát bầu trời trước, rồi nối kiến thức nền trên lộ trình học.',
      href: skyHref.startsWith('/') ? skyHref : '/explore?view=sky',
      ctaLabel: ctaFromKind('open_sky', false),
      hasProgress: false,
      secondary: lessonSecondaryFromGuardrail(guardrail),
    }
  }

  if (resolvedIntent === 'community') {
    const communityHref =
      primaryHref?.includes('/community')
        ? primaryHref
        : '/community/hoi-dap-hoc-tap'
    return {
      kind: 'open_community',
      title: 'Tham gia cộng đồng',
      reason: 'Hỏi đáp với người học khác — vẫn nên bắt đầu một bài ngắn trên lộ trình để có nền.',
      href: communityHref,
      ctaLabel: ctaFromKind('open_community', false),
      hasProgress: false,
      secondary: lessonSecondaryFromGuardrail(guardrail),
    }
  }

  // learn_path | mixed | default
  return lpPrimary
}

/** Sau khi hoàn thành / master một bài — primary = bài tiếp theo, secondary = Explore liên quan. */
export function resolvePostLessonNextAction(
  modules: LearningModule[],
  completionMap: LessonCompletionMap,
  completedLessonId: string,
): LearnerNextAction {
  const guardrail = buildLearningJourneyGuardrail(modules, completionMap, completedLessonId)
  const explore = exploreSecondaryForLesson(modules, completedLessonId)
  const kind = kindFromGuardrail(guardrail.status)
  const hasProgress = true

  return {
    kind,
    title: guardrail.status === 'review'
      ? 'Bạn đã hoàn thành lộ trình hiện có'
      : 'Bước tiếp theo trên lộ trình',
    reason: guardrail.reason,
    href: guardrail.href || '/tutorial',
    ctaLabel: ctaFromKind(kind, hasProgress),
    lessonId: guardrail.lessonId,
    lessonTitle: guardrail.lessonTitle,
    hasProgress,
    secondary: explore || {
      title: 'Khám phá 3D',
      href: '/explore',
      ctaLabel: 'Mở Explore',
    },
  }
}
