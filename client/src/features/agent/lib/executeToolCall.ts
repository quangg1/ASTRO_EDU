import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { DepthLevel } from '@/data/learningPathCurriculum'
import type { AgentClientAction } from '../types'
import {
  toolCallsToTutorActions,
  type TutorAction,
} from '@/components/ai-tutor/parseTutorActions'

export function clientActionToTutorAction(action: AgentClientAction): TutorAction | null {
  if (action.type === 'open_lesson') {
    return { type: 'open_lesson', lessonSlug: action.lessonSlug }
  }
  if (action.type === 'focus_showcase_entity') {
    return {
      type: 'focus_showcase_entity',
      entityId: action.entityId,
      entityName: action.entityName ?? undefined,
      openHistory: action.openHistory,
    }
  }
  if (action.type === 'go_to_explore' || action.type === 'navigate_to_narrative') {
    return { type: 'go_to_explore', stageTime: action.stageTimeMa }
  }
  if (action.type === 'open_courses') return { type: 'open_courses' }
  if (action.type === 'open_dashboard') return { type: 'open_dashboard' }
  if (action.type === 'open_my_courses') return { type: 'open_my_courses' }
  return null
}

export function executeAgentClientAction(
  router: AppRouterInstance,
  action: AgentClientAction,
  options?: {
    courseSlug?: string
    onNavigate?: () => void
    onSuggestDepth?: (depth: DepthLevel, reason: string) => void
  },
): void {
  if (action.type === 'open_learning_path_lesson') {
    router.push(
      `/tutorial/${encodeURIComponent(action.moduleId)}/${encodeURIComponent(action.nodeId)}/${encodeURIComponent(action.lessonId)}`,
    )
    options?.onNavigate?.()
    return
  }

  if (action.type === 'open_lesson' && options?.courseSlug) {
    router.push(
      `/courses/${options.courseSlug}/learn/${encodeURIComponent(action.lessonSlug)}`,
    )
    options?.onNavigate?.()
    return
  }

  if (action.type === 'focus_showcase_entity') {
    const q = new URLSearchParams()
    q.set('mode', 'showcase')
    q.set('entity', action.entityId)
    if (action.openHistory) {
      q.set('history', '1')
    }
    router.push(`/explore?${q.toString()}`)
    options?.onNavigate?.()
    return
  }

  if (action.type === 'navigate_to_narrative' || action.type === 'go_to_explore') {
    const q = new URLSearchParams()
    if (action.type === 'go_to_explore' || action.planet === 'earth') {
      q.set('stage', String(action.stageTimeMa))
    }
    if (action.type === 'navigate_to_narrative') {
      if (action.entityId) q.set('entity', action.entityId)
      else if (action.planet && action.planet !== 'earth') q.set('entity', action.planet)
      if (action.pinId) q.set('pin', action.pinId)
      if (action.entityId && !q.has('stage')) {
        q.set('mode', 'showcase')
      }
    }
    router.push(`/explore?${q.toString()}`)
    options?.onNavigate?.()
    return
  }

  if (action.type === 'highlight_concept_in_map') {
    router.push(`/tutorial/knowledge-map?c=${encodeURIComponent(action.conceptId)}`)
    options?.onNavigate?.()
    return
  }

  if (action.type === 'show_related_lessons') {
    return
  }

  if (action.type === 'suggest_community_thread') {
    return
  }

  if (action.type === 'start_recall_quiz') {
    const onLesson =
      typeof window !== 'undefined' &&
      window.location.pathname.includes(encodeURIComponent(action.lessonId))
    if (onLesson) {
      window.dispatchEvent(new CustomEvent('galaxies:open-recall-quiz'))
    } else {
      router.push(
        `/tutorial/${encodeURIComponent(action.moduleId)}/${encodeURIComponent(action.nodeId)}/${encodeURIComponent(action.lessonId)}`,
      )
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('galaxies:open-recall-quiz'))
      }, 400)
    }
    options?.onNavigate?.()
    return
  }

  if (action.type === 'suggest_depth_switch') {
    const d = action.suggestedDepth as DepthLevel
    if (['beginner', 'explorer', 'researcher'].includes(d)) {
      options?.onSuggestDepth?.(d, action.reason)
    }
    return
  }

  const tutor = clientActionToTutorAction(action)
  if (!tutor) return
  if (tutor.type === 'go_to_explore') {
    router.push(`/explore?stage=${tutor.stageTime}`)
    options?.onNavigate?.()
    return
  }
  if (tutor.type === 'open_courses') router.push('/courses')
  else if (tutor.type === 'open_dashboard') router.push('/dashboard')
  else if (tutor.type === 'open_my_courses') router.push('/my-courses')
  options?.onNavigate?.()
}

export function toolResultsToTutorActions(
  toolResults: Array<{ ok: boolean; clientAction?: AgentClientAction }> | undefined,
): TutorAction[] {
  const actions: TutorAction[] = []
  for (const r of toolResults || []) {
    if (!r.ok || !r.clientAction) continue
    const t = clientActionToTutorAction(r.clientAction)
    if (t) actions.push(t)
  }
  return actions
}

export function mergeAgentToolCalls(
  toolCalls: unknown,
  toolResults: Array<{ ok: boolean; clientAction?: AgentClientAction }> | undefined,
): TutorAction[] {
  const fromResults = toolResultsToTutorActions(toolResults)
  const hasFocus = fromResults.some((a) => a.type === 'focus_showcase_entity')
  const fromCalls = toolCallsToTutorActions(toolCalls).filter(
    (a) => !(hasFocus && a.type === 'go_to_explore'),
  )
  const filteredResults = hasFocus
    ? fromResults.filter((a) => a.type !== 'go_to_explore')
    : fromResults
  const seen = new Set<string>()
  const out: TutorAction[] = []
  for (const a of [...filteredResults, ...fromCalls]) {
    const key =
      a.type === 'open_lesson'
        ? `lesson:${a.lessonSlug}`
        : a.type === 'go_to_explore'
          ? `explore:${a.stageTime}`
          : a.type === 'focus_showcase_entity'
            ? `focus:${a.entityId}`
            : a.type
    if (seen.has(key)) continue
    seen.add(key)
    out.push(a)
  }
  return out
}
