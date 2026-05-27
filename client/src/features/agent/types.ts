export type AgentSurface = 'learning_path' | 'explore' | 'course' | 'dashboard' | 'general'

export type SessionContext = {
  surface: AgentSurface
  pathname: string
  routeLabel?: string | null
  lessonId?: string | null
  lessonTitle?: string | null
  moduleId?: string | null
  nodeId?: string | null
  depth?: string | null
  courseSlug?: string | null
  narrativeKey?: string | null
  planet?: string | null
  stageTimeMa?: number | null
  entityId?: string | null
  /** Chỉ bật coach Socratic sau khi vừa trượt quiz trong phiên này — không suy từ dữ liệu cũ. */
  coachTrigger?: 'quiz_failed' | null
  /** Có quiz ôn cho bài hiện tại (client biết từ LP). */
  recallQuizAvailable?: boolean
  activeSectionId?: string | null
  activeSectionTitle?: string | null
  activeSectionExcerpt?: string | null
}

export type SpacedReviewLesson = {
  lessonId: string
  title: string
  moduleId?: string
  nodeId?: string
  dueReason?: string
  daysSinceReview?: number
}

export type DepthSuggestion = {
  suggestedDepth: string
  reason: string
  confidence?: string
}

export type WeakLessonSignal = {
  lessonId: string
  signals: string[]
  score: number
  quizFailCount?: number
  dwellSec?: number
  revisitCount?: number
}

export type LearnerSnapshot = {
  completedLessonCount?: number
  masteredLessonCount?: number
  recentLessonIds?: string[]
  weakLessons?: WeakLessonSignal[]
  misconceptions?: Array<{ tag: string; lessonId?: string; conceptId?: string }>
  coachChips?: Array<{ label: string; action: string; lessonId?: string; moduleId?: string; nodeId?: string }>
  spacedReviewDue?: { dueLessons: SpacedReviewLesson[]; totalDue: number }
  preferredDepth?: string | null
  depthSuggestion?: DepthSuggestion | null
}

export type AgentClientAction =
  | { type: 'open_lesson'; courseSlug: string; lessonSlug: string }
  | {
      type: 'open_learning_path_lesson'
      lessonId: string
      moduleId: string
      nodeId: string
    }
  | { type: 'navigate_to_narrative'; planet: string; stageTimeMa: number; pinId?: string | null; entityId?: string | null }
  | { type: 'go_to_explore'; stageTimeMa: number }
  | { type: 'suggest_depth_switch'; suggestedDepth: string; reason: string }
  | { type: 'open_courses' }
  | { type: 'open_dashboard' }
  | { type: 'open_my_courses' }
  | { type: 'highlight_concept_in_map'; conceptId: string }
  | {
      type: 'show_related_lessons'
      lessons: Array<{ lessonId: string; title: string; moduleId: string; nodeId: string }>
    }
  | { type: 'start_recall_quiz'; lessonId: string; moduleId: string; nodeId: string }

export type AgentMessageResponse = {
  success: boolean
  session?: {
    sessionId?: string
    tier?: string
    quotaRemaining?: number | null
    guestSessionId?: string
    trialExpired?: boolean
    allowedTools?: string[]
  }
  message?: { role: string; content: string }
  tool_calls?: Array<{ id?: string; name: string; arguments: Record<string, unknown> }>
  tool_results?: Array<{
    id?: string
    name?: string
    ok: boolean
    clientAction?: AgentClientAction
    suggestion?: string
  }>
  fallback?: boolean
  chips?: Array<{ label: string; action: string }>
  error?: string
  code?: string
}
