'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DepthLevel } from '@/data/learningPathCurriculum'
import type { TutorAction } from '@/components/ai-tutor/parseTutorActions'
import { useAuthStore } from '@/features/auth/public'
import { useToast } from '@/design-system'
import {
  postAgentMessage,
  postAgentMessageFeedback,
  postDepthPreference,
  prefetchAgentContext,
  fetchAgentSessionDetail,
} from '../api/agentApi'
import { executeAgentClientAction, mergeAgentToolCalls } from '../lib/executeToolCall'
import { normalizeAssistantMarkdown } from '../lib/normalizeAssistantMarkdown'
import type { AgentChip } from '../ui/AgentChips'
import type { CommunityThreadSuggestion, LearnerSnapshot, SessionContext } from '../types'

export type CosmoChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: TutorAction[]
  streaming?: boolean
  imageAttachment?: { mediaType: string; base64: string }
  cacheEntryId?: string
  cacheSource?: string
}

type SendOptions = {
  image?: { base64: string; mediaType: string }
  onClose?: () => void
}

type Params = {
  sessionContext: SessionContext
  learnerSnapshot?: LearnerSnapshot
  onSuggestDepth?: (depth: DepthLevel, reason: string) => void
  suggestions?: string[]
}

export function useCosmoAssistantChat({
  sessionContext,
  learnerSnapshot,
  onSuggestDepth,
  suggestions = [],
}: Params) {
  const router = useRouter()
  const { user } = useAuthStore()
  const toast = useToast()
  const [messages, setMessages] = useState<CosmoChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [fallbackChips, setFallbackChips] = useState<AgentChip[]>([])
  const [depthBanner, setDepthBanner] = useState<{ depth: DepthLevel; reason: string } | null>(null)
  const [relatedLessons, setRelatedLessons] = useState<
    Array<{ lessonId: string; title: string; moduleId: string; nodeId: string }>
  >([])
  const [communityThreads, setCommunityThreads] = useState<CommunityThreadSuggestion[]>([])
  const streamContentRef = useRef('')
  const lastUserQueryRef = useRef('')

  const isContextual =
    sessionContext.surface === 'learning_path' ||
    sessionContext.surface === 'explore' ||
    sessionContext.surface === 'course' ||
    sessionContext.surface === 'calendar'

  const prefetchKey = useMemo(
    () =>
      [
        sessionContext.surface,
        sessionContext.lessonId ?? '',
        sessionContext.moduleId ?? '',
        sessionContext.activeSectionId ?? '',
        sessionContext.planet ?? '',
        sessionContext.narrativeKey ?? '',
        sessionContext.coachTrigger ?? '',
        sessionContext.quizLock ?? '',
        sessionContext.recallQuizActive ? '1' : '0',
        sessionContext.calendarEventId ?? '',
        sessionContext.calendarEventTitle ?? '',
        learnerSnapshot?.recentLessonIds?.[0] ?? '',
        learnerSnapshot?.depthSuggestion?.suggestedDepth ?? '',
      ].join('|'),
    [
      sessionContext.surface,
      sessionContext.lessonId,
      sessionContext.moduleId,
      sessionContext.activeSectionId,
      sessionContext.planet,
      sessionContext.narrativeKey,
      sessionContext.coachTrigger,
      sessionContext.quizLock,
      sessionContext.recallQuizActive,
      sessionContext.calendarEventId,
      sessionContext.calendarEventTitle,
      learnerSnapshot?.recentLessonIds,
      learnerSnapshot?.depthSuggestion?.suggestedDepth,
    ],
  )

  const sessionContextRef = useRef(sessionContext)
  const learnerSnapshotRef = useRef(learnerSnapshot)
  sessionContextRef.current = sessionContext
  learnerSnapshotRef.current = learnerSnapshot

  useEffect(() => {
    if (!user?.id || !isContextual) return
    const timer = window.setTimeout(() => {
      const ctx = sessionContextRef.current
      if (ctx.quizLock || ctx.recallQuizActive) return
      void prefetchAgentContext(ctx, learnerSnapshotRef.current)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [user?.id, isContextual, prefetchKey])

  useEffect(() => {
    const sug = learnerSnapshot?.depthSuggestion
    if (sug?.suggestedDepth && ['beginner', 'explorer', 'researcher'].includes(sug.suggestedDepth)) {
      setDepthBanner({
        depth: sug.suggestedDepth as DepthLevel,
        reason: sug.reason || 'Gợi ý đổi mức độ học',
      })
    }
  }, [learnerSnapshot?.depthSuggestion])

  const defaultSuggestions = useMemo(
    () =>
      suggestions.length > 0
        ? suggestions
        : sessionContext.surface === 'explore'
          ? [
              'Di chuyển tới Venus',
              'Giải thích thời kỳ đang xem',
              'Có hóa thạch nào đặc biệt không?',
            ]
          : sessionContext.lessonTitle
            ? [
                ...(sessionContext.activeSectionTitle
                  ? [`Giải thích mục "${sessionContext.activeSectionTitle}"`]
                  : []),
                `Tóm tắt bài "${sessionContext.lessonTitle}"`,
                'Bài liên quan nên đọc tiếp?',
              ]
            : ['Kỷ Cambrian là gì?', 'Hóa thạch là gì?', 'Giải thích Great Oxidation'],
    [suggestions, sessionContext],
  )

  const runAction = useCallback(
    (action: TutorAction, onClose?: () => void) => {
      if (action.type === 'focus_showcase_entity') {
        executeAgentClientAction(
          router,
          {
            type: 'focus_showcase_entity',
            entityId: action.entityId,
            entityName: action.entityName ?? null,
            openHistory: action.openHistory,
          },
          { onNavigate: onClose },
        )
        return
      }
      if (action.type === 'go_to_explore') {
        router.push(`/explore?stage=${action.stageTime}`)
        onClose?.()
        return
      }
      if (action.type === 'open_lesson' && sessionContext.courseSlug) {
        executeAgentClientAction(
          router,
          {
            type: 'open_lesson',
            courseSlug: sessionContext.courseSlug,
            lessonSlug: action.lessonSlug,
          },
          { courseSlug: sessionContext.courseSlug, onNavigate: onClose },
        )
      }
    },
    [router, sessionContext.courseSlug],
  )

  const runClientAction = useCallback(
    (results: Parameters<typeof executeAgentClientAction>[1], onClose?: () => void) => {
      executeAgentClientAction(router, results, {
        courseSlug: sessionContext.courseSlug ?? undefined,
        onNavigate: onClose,
        onSuggestDepth,
      })
    },
    [router, sessionContext.courseSlug, onSuggestDepth],
  )

  const navigateLpLesson = useCallback(
    (chip: AgentChip, onClose?: () => void) => {
      if (!chip.lessonId || !chip.moduleId || !chip.nodeId) return false
      router.push(
        `/tutorial/${encodeURIComponent(chip.moduleId)}/${encodeURIComponent(chip.nodeId)}/${encodeURIComponent(chip.lessonId)}`,
      )
      onClose?.()
      return true
    },
    [router],
  )

  const send = useCallback(
    async (text: string, options?: SendOptions) => {
      const snapImage = options?.image
      const trimmed = text.trim()
      const hasImage = !!snapImage
      if ((!trimmed && !hasImage) || loading) return false
      if (!user) {
        setError('Đăng nhập để dùng trợ lý học tập.')
        return false
      }
      setInput('')
      setError(null)
      setFallbackChips([])
      setRelatedLessons([])
      setCommunityThreads([])
      setRelatedLessons([])
      const userContent = trimmed || 'Giải thích hình ảnh này.'
      lastUserQueryRef.current = userContent
      const userMsg: CosmoChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: userContent,
        ...(snapImage ? { imageAttachment: { base64: snapImage.base64, mediaType: snapImage.mediaType } } : {}),
      }
      const assistantId = `a-${Date.now()}`
      const next = [...messages, userMsg]
      setMessages([...next, { id: assistantId, role: 'assistant', content: '', streaming: true }])
      setLoading(true)
      streamContentRef.current = ''

      try {
        const res = await postAgentMessage({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          sessionContext,
          learnerSnapshot,
          sessionId,
          image_base64: snapImage?.base64,
          image_media_type: snapImage?.mediaType,
          stream: true,
          onStreamEvent: (ev) => {
            if (ev.event === 'token') {
              setLoading(false)
              streamContentRef.current += ev.data.content || ''
              const streamed = normalizeAssistantMarkdown(streamContentRef.current)
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: streamed, streaming: true }
                    : msg,
                ),
              )
            }
            if (ev.event === 'fallback' && ev.data.chips) {
              setFallbackChips(ev.data.chips)
            }
            if (ev.event === 'cache_meta') {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        cacheEntryId: ev.data.cacheEntryId || undefined,
                        cacheSource: ev.data.source || undefined,
                      }
                    : msg,
                ),
              )
            }
          },
        })

        if (!res.success) {
          setMessages((m) => m.filter((msg) => msg.id !== assistantId))
          if (res.code === 'AGENT_QUIZ_LOCKED') {
            setError('Trợ lý AI tắt trong lúc làm kiểm tra. Đóng bài kiểm tra để tiếp tục.')
          } else {
            setError(res.error || 'Không nhận được phản hồi.')
          }
          return false
        }

        if (res.session?.sessionId) {
          setSessionId(res.session.sessionId)
          window.dispatchEvent(
            new CustomEvent('galaxies:agent-session', {
              detail: { sessionId: res.session.sessionId },
            }),
          )
        }
        if (res.chips?.length) setFallbackChips(res.chips)

        const actions = mergeAgentToolCalls(res.tool_calls, res.tool_results)
        const content = normalizeAssistantMarkdown(
          res.message?.content || streamContentRef.current,
        )

        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content,
                  streaming: false,
                  actions: actions.length ? actions : undefined,
                }
              : msg,
          ),
        )

        for (const tr of res.tool_results || []) {
          if (!tr.ok) {
            if (tr.suggestion) {
              toast.show(tr.suggestion, { tone: tr.code === 'auth_required' ? 'info' : 'warning' })
            }
            continue
          }
          if (!tr.clientAction) continue
          if (tr.clientAction.type === 'show_related_lessons') {
            setRelatedLessons(tr.clientAction.lessons.slice(0, 4))
            continue
          }
          if (tr.clientAction.type === 'suggest_community_thread') {
            setCommunityThreads(tr.clientAction.threads.slice(0, 4))
            continue
          }
          if (tr.clientAction.type === 'search_learning_content') {
            if (tr.clientAction.lpLessons?.length) {
              setRelatedLessons(
                tr.clientAction.lpLessons.slice(0, 4).map((l) => ({
                  lessonId: l.lessonId,
                  title: l.title,
                  moduleId: l.moduleId,
                  nodeId: l.nodeId,
                })),
              )
            }
            if (tr.clientAction.communityThreads?.length) {
              setCommunityThreads(tr.clientAction.communityThreads.slice(0, 4))
            }
            continue
          }
          if (tr.clientAction.type === 'suggest_depth_switch') {
            setDepthBanner({
              depth: tr.clientAction.suggestedDepth as DepthLevel,
              reason: tr.clientAction.reason,
            })
            continue
          }
          if (tr.clientAction.type === 'generate_concept_quiz') {
            runClientAction(tr.clientAction, options?.onClose)
            continue
          }
          runClientAction(tr.clientAction, options?.onClose)
          break
        }
        return true
      } catch {
        setMessages((m) => m.filter((msg) => msg.id !== assistantId))
        setError('Trợ lý tạm thời không khả dụng.')
        setFallbackChips([
          { label: 'Mở Khám phá', action: 'explore' },
          { label: 'Bài tiếp theo', action: 'next_lesson' },
        ])
        return false
      } finally {
        setLoading(false)
      }
    },
    [loading, user, messages, sessionContext, learnerSnapshot, sessionId, runClientAction, toast],
  )

  const explainActiveSection = useCallback(() => {
    const text = sessionContext.activeSectionTitle
      ? `Giải thích mục "${sessionContext.activeSectionTitle}" trong bài "${sessionContext.lessonTitle || ''}" — dùng ngôn ngữ dễ hiểu, bám nội dung đoạn đang đọc.`
      : `Giải thích bài "${sessionContext.lessonTitle || ''}" — tóm tắt ý chính.`
    setInput(text)
    return text
  }, [sessionContext.activeSectionTitle, sessionContext.lessonTitle])

  const handleChip = useCallback(
    (chip: AgentChip, onClose?: () => void) => {
      if (chip.action === 'explore') {
        router.push('/explore?stage=540')
        onClose?.()
        return
      }
      if (chip.action === 'open_agent') return
      if (chip.action === 'spaced_review' && chip.lessonId) {
        if (navigateLpLesson(chip, onClose)) return
        const due = learnerSnapshot?.spacedReviewDue?.dueLessons?.find((d) => d.lessonId === chip.lessonId)
        if (due?.moduleId && due?.nodeId) {
          router.push(
            `/tutorial/${encodeURIComponent(due.moduleId)}/${encodeURIComponent(due.nodeId)}/${encodeURIComponent(due.lessonId)}`,
          )
          onClose?.()
        }
        return
      }
      if (chip.action === 'review_lesson' && chip.lessonId) {
        if (navigateLpLesson(chip, onClose)) return
        setInput('Giúp tôi ôn lại bài này')
        return
      }
      if (chip.action === 'continue_last' && chip.lessonId) {
        if (navigateLpLesson(chip, onClose)) return
        setInput('Tiếp tục bài gần nhất nên học gì?')
        return
      }
      if (chip.action === 'recall_quiz') {
        window.dispatchEvent(new CustomEvent('galaxies:open-recall-quiz'))
        return
      }
      if (chip.action === 'stay') {
        setInput(chip.label)
        return
      }
      setInput(chip.label)
    },
    [router, navigateLpLesson, learnerSnapshot?.spacedReviewDue?.dueLessons],
  )

  const submitFeedback = useCallback(
    async (messageId: string, rating: 1 | -1) => {
      if (!user) return false
      const assistantMsg = messages.find((m) => m.id === messageId)
      return postAgentMessageFeedback({
        sessionId,
        messageId,
        rating,
        surface: sessionContext.surface,
        lessonId: sessionContext.lessonId ?? undefined,
        cacheEntryId: assistantMsg?.cacheEntryId,
        userQuery: lastUserQueryRef.current || undefined,
      })
    },
    [user, sessionId, sessionContext.surface, sessionContext.lessonId, messages],
  )

  const startNewConversation = useCallback(() => {
    setSessionId(undefined)
    setMessages([])
    setInput('')
    setError(null)
    setFallbackChips([])
    setDepthBanner(null)
    setRelatedLessons([])
    setCommunityThreads([])
  }, [])

  const loadHistorySession = useCallback(async (targetSessionId: string) => {
    const detail = await fetchAgentSessionDetail(targetSessionId)
    if (!detail?.messages?.length) return false
    setSessionId(detail.sessionId)
    setMessages(
      detail.messages.map((m, i) => ({
        id: `h-${detail.sessionId}-${i}`,
        role: m.role,
        content:
          m.role === 'assistant'
            ? normalizeAssistantMarkdown(
                m.hasImage && !m.content.trim() ? '📷 Ảnh đính kèm' : m.content,
              )
            : m.hasImage && !m.content.trim()
              ? '📷 Ảnh đính kèm'
              : m.content,
      })),
    )
    setInput('')
    setError(null)
    setFallbackChips([])
    setDepthBanner(null)
    setRelatedLessons([])
    setCommunityThreads([])
    window.dispatchEvent(
      new CustomEvent('galaxies:agent-session', {
        detail: { sessionId: detail.sessionId },
      }),
    )
    return true
  }, [])

  return {
    user,
    isContextual,
    messages,
    setMessages,
    input,
    setInput,
    loading,
    error,
    setError,
    sessionId,
    fallbackChips,
    depthBanner,
    setDepthBanner,
    relatedLessons,
    communityThreads,
    defaultSuggestions,
    send,
    explainActiveSection,
    handleChip,
    runAction,
    navigateLpLesson,
    postDepthPreference,
    onSuggestDepth,
    startNewConversation,
    loadHistorySession,
    submitFeedback,
  }
}
