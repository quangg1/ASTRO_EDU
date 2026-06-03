import type { ConceptLearningStateSummary } from '@/features/learning-state/public'

export type ConceptChipView = {
  id: string
  title: string
  mastery: number | null
  needsReview: boolean
  lessonHref: string | null
  lessonTitle: string | null
  nextBestAction: string | null
}

export function needsConceptReview(state: ConceptLearningStateSummary | undefined): boolean {
  if (!state) return false
  if (state.mastery < 55) return true
  if (state.nextBestAction === 'concept_quiz' || state.nextBestAction === 'review_lesson') return true
  if (state.misconceptionCount > 0 && state.mastery < 75) return true
  return false
}

export function masteryStatusLabel(mastery: number | null, needsReview: boolean): string {
  if (mastery == null) return 'Chưa kiểm tra'
  if (needsReview) return 'Cần ôn'
  if (mastery >= 80) return 'Đã nắm'
  if (mastery >= 55) return 'Đang học'
  return 'Yếu'
}

export function masteryStatusTone(
  mastery: number | null,
  needsReview: boolean,
): 'strong' | 'mid' | 'warn' | 'muted' {
  if (mastery == null) return 'muted'
  if (needsReview) return 'warn'
  if (mastery >= 80) return 'strong'
  if (mastery >= 55) return 'mid'
  return 'warn'
}
