'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTutorContextStore } from '@/store/useTutorContextStore'
import { useAuthStore } from '@/store/useAuthStore'
import { parseTutorActions, type TutorAction } from './parseTutorActions'

/** Số tin nhắn tối đa gửi lên API (chỉ gửi đoạn gần nhất để tránh out of context trên máy local). */
const MAX_MESSAGES_FOR_API = 10

const STORAGE_KEY_PREFIX = 'tutor_history'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  /** Chỉ có khi role === 'assistant' và có parse được actions (chế độ course) */
  actions?: TutorAction[]
  /** Nội dung đã bỏ dòng [ACTION:...] để hiển thị */
  displayContent?: string
}

function storageKey(userId: string, mode: string, courseSlug?: string | null): string {
  return `${STORAGE_KEY_PREFIX}_${userId}_${mode}_${courseSlug ?? 'general'}`
}

function loadMessagesFromStorage(key: string): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ id: string; role: string; content: string; createdAt: string; actions?: TutorAction[]; displayContent?: string }>
    return parsed.map((m) => ({
      ...m,
      role: m.role as 'user' | 'assistant',
      createdAt: new Date(m.createdAt),
    }))
  } catch {
    return []
  }
}

function saveMessagesToStorage(key: string, messages: Message[]) {
  if (typeof window === 'undefined') return
  try {
    const toSave = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      actions: m.actions,
      displayContent: m.displayContent,
    }))
    localStorage.setItem(key, JSON.stringify(toSave))
  } catch {
    // ignore
  }
}

export function AITutor() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const { mode, course, requestAgentOpen, setRequestAgentOpen } = useTutorContextStore()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  const [attachmentImage, setAttachmentImage] = useState<{ base64: string; type: string } | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCourseMode = mode === 'course' && course
  /** Trong course = Agent (tương tác trang); ngoài = Generative AI (chỉ trả lời). */
  const isAgent = isCourseMode
  const canUseAI = !!user
  const historyKey = user ? storageKey(user.id, mode, course?.courseSlug) : null

  // Load lịch sử từ localStorage khi đã đăng nhập và đổi mode/course
  useEffect(() => {
    if (historyKey) {
      const stored = loadMessagesFromStorage(historyKey)
      setMessages(stored)
    } else {
      setMessages([])
    }
  }, [historyKey])

  // Lưu lịch sử sau mỗi thay đổi messages (chỉ khi đã đăng nhập)
  useEffect(() => {
    if (historyKey && messages.length > 0) saveMessagesToStorage(historyKey, messages)
  }, [historyKey, messages])

  useEffect(() => {
    if (requestAgentOpen) setRequestAgentOpen(false)
  }, [requestAgentOpen, setRequestAgentOpen])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const onDragStart = (e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    e.preventDefault()
  }
  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      setPos({ x: dragStart.current.px + (e.clientX - dragStart.current.x), y: dragStart.current.py + (e.clientY - dragStart.current.y) })
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const executeAction = (action: TutorAction) => {
    setExecuting(true)
    if (action.type === 'open_lesson' && course) {
      router.push(`/courses/${course.courseSlug}?lesson=${encodeURIComponent(action.lessonSlug)}`)
      setOpen(false)
    } else if (action.type === 'go_to_explore') {
      router.push(`/explore?stage=${action.stageTime}`)
      setOpen(false)
    }
    setTimeout(() => setExecuting(false), 800)
  }

  /** Agent: thực hiện ngay hành động đầu tiên của tin nhắn (tự thao tác) */
  const executeFirstAction = (msg: Message) => {
    if (msg.actions?.length) executeAction(msg.actions[0])
  }

  const onAttachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      const base64 = match ? match[2] : dataUrl
      const type = file.type || 'image/jpeg'
      setAttachmentImage({ base64, type })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const sendMessage = async () => {
    const text = input.trim()
    const hasImage = !!attachmentImage
    if ((!text && !hasImage) || loading || !canUseAI) return

    setInput('')
    setError(null)
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text || 'Giải thích hình ảnh này.',
      createdAt: new Date(),
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Chỉ gửi đoạn gần nhất lên API để tránh out of context (máy local giới hạn token)
      const toSend = newMessages
        .slice(-MAX_MESSAGES_FOR_API)
        .map((m) => ({ role: m.role, content: m.content }))
      const body: Record<string, unknown> = {
        messages: toSend,
        context: isCourseMode ? 'course' : 'general',
        course: isCourseMode ? course : null,
      }
      if (attachmentImage) {
        body.image_base64 = attachmentImage.base64
        body.image_media_type = attachmentImage.type
        setAttachmentImage(null)
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Lỗi kết nối')
        setLoading(false)
        return
      }

      const rawContent = data.message?.content ?? ''
      const { text: displayContent, actions } = isCourseMode ? parseTutorActions(rawContent) : { text: rawContent, actions: [] as TutorAction[] }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: rawContent,
        displayContent: displayContent || rawContent,
        actions: actions.length > 0 ? actions : undefined,
        createdAt: new Date(),
      }
      setMessages((m) => [...m, assistantMsg])
    } catch {
      setError('Không kết nối được AI. Kiểm tra LM Studio đã chạy chưa.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestionGeneral = ['Kỷ Cambrian là gì?', 'Hóa thạch là gì?', 'Giải thích Great Oxidation']
  const suggestionCourse = course
    ? [
        `Giải thích bài "${course.lessons[0]?.title ?? ''}"`,
        'Bài tiếp theo nên học gì?',
        'Mở Khám phá xem kỷ Cambrian',
      ].filter(Boolean)
    : suggestionGeneral

  return (
    <>
      <button
        type="button"
        data-ai-tutor-fab
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-black ${canUseAI ? 'hover:scale-110' : 'opacity-80 hover:opacity-100'}`}
        style={{
          background: isAgent
            ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)'
            : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
          boxShadow: isAgent ? '0 4px 24px rgba(139, 92, 246, 0.45)' : '0 4px 24px rgba(6, 182, 212, 0.45)',
        }}
        title={canUseAI ? (isAgent ? 'AI Agent – có thể mở bài, Khám phá' : 'AI Tutor – hỏi đáp') : 'Đăng nhập để dùng AI'}
        aria-label={canUseAI ? (isAgent ? 'Mở AI Agent' : 'Mở AI Tutor') : 'Đăng nhập để dùng AI'}
      >
        <span className="text-2xl" aria-hidden>{isAgent ? '🎯' : '✨'}</span>
      </button>

      {open && (
        <div
          data-ai-tutor-panel
          className="fixed z-50 w-[min(420px,calc(100vw-3rem))] h-[min(560px,calc(100vh-8rem))] flex flex-col rounded-2xl overflow-hidden animate-slide-up-fade"
          style={{
            bottom: `${96 - pos.y}px`,
            right: `${24 - pos.x}px`,
            background: isAgent
              ? 'linear-gradient(180deg, rgba(30, 27, 47, 0.98) 0%, rgba(22, 20, 38, 0.99) 100%)'
              : 'linear-gradient(180deg, rgba(10, 25, 47, 0.97) 0%, rgba(6, 22, 42, 0.98) 100%)',
            boxShadow: isAgent
              ? '0 0 0 1px rgba(139, 92, 246, 0.25), 0 24px 48px rgba(0,0,0,0.5)'
              : '0 0 0 1px rgba(6, 182, 212, 0.25), 0 24px 48px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={onDragStart}
            style={{
              borderBottom: isAgent ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(6, 182, 212, 0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{isAgent ? '🎯' : '✨'}</span>
              <span className={`font-semibold ${isAgent ? 'text-violet-300' : 'text-cyan-300'}`}>
                {isAgent ? 'AI Agent' : 'AI Tutor'}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isAgent ? 'text-violet-300/90 bg-violet-500/20' : 'text-cyan-400/80 bg-cyan-500/10'
                }`}
              >
                {isAgent ? 'Có thể thao tác trang' : 'Generative AI'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {!canUseAI && (
              <div className="text-center py-10 px-4">
                <p className="text-gray-300 text-sm mb-2">Chỉ thành viên đã đăng nhập mới có thể sử dụng AI Tutor.</p>
                <p className="text-gray-500 text-xs mb-4">Đăng nhập để trò chuyện và lưu lịch sử hội thoại.</p>
                <Link
                  href="/login?redirect=/"
                  className="inline-block px-6 py-2.5 rounded-xl bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-400 transition-colors"
                >
                  Đăng nhập
                </Link>
              </div>
            )}
            {canUseAI && messages.length === 0 && !loading && (
              <div className="text-center py-8 px-4">
                <p className={`text-sm mb-2 ${isAgent ? 'text-violet-300/90' : 'text-cyan-300/90'}`}>
                  {isAgent
                    ? `Mình là Agent của khóa "${course?.courseTitle ?? ''}". Mình có thể mở bài, chuyển Khám phá, hoặc gợi ý bài tiếp theo khi bạn hỏi.`
                    : 'Chào bạn! Mình là AI Tutor – trả lời câu hỏi về lịch sử Trái Đất, hóa thạch, thiên văn.'}
                </p>
                <p className="text-gray-500 text-xs mb-4">
                  {isAgent ? 'Hỏi "mở bài X" hoặc "xem Khám phá kỷ Cambrian" – mình sẽ thực hiện thao tác trên trang.' : 'Hỏi bất kỳ điều gì – mình chỉ trả lời, không thao tác trang.'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {(isAgent ? suggestionCourse : suggestionGeneral).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        isAgent
                          ? 'bg-violet-500/15 text-violet-300 hover:bg-violet-500/25'
                          : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {canUseAI && messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? isAgent
                        ? 'bg-violet-500/25 text-violet-50 border border-violet-400/30'
                        : 'bg-cyan-500/25 text-cyan-50 border border-cyan-400/30'
                      : 'bg-white/5 text-gray-200 border border-white/10'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {m.role === 'assistant' && m.displayContent != null ? m.displayContent : m.content}
                  </div>
                  {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      {isAgent && (
                        <button
                          type="button"
                          onClick={() => executeFirstAction(m)}
                          disabled={executing}
                          className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-violet-500/40 text-violet-100 hover:bg-violet-500/60 border border-violet-400/40 disabled:opacity-60 transition-colors"
                        >
                          {executing ? 'Đang thực hiện...' : '▶ Thực hiện ngay'}
                        </button>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {m.actions.map((a, i) => {
                          if (a.type === 'open_lesson') {
                            const lesson = course?.lessons.find((l) => l.slug === a.lessonSlug)
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => executeAction(a)}
                                disabled={executing}
                                className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/30 text-violet-200 hover:bg-violet-500/50 border border-violet-400/30 transition-colors disabled:opacity-60"
                              >
                                📖 {lesson?.title ?? a.lessonSlug}
                              </button>
                            )
                          }
                          if (a.type === 'go_to_explore') {
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => executeAction(a)}
                                disabled={executing}
                                className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/50 border border-cyan-400/30 transition-colors disabled:opacity-60"
                              >
                                🌍 Xem {a.stageTime} Ma trên Khám phá
                              </button>
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {canUseAI && loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-white/5 border border-white/10 flex items-center gap-2">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full animate-bounce ${isAgent ? 'bg-violet-400' : 'bg-cyan-400'}`}
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                  <span className="text-gray-500 text-xs">Đang suy nghĩ...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl px-3 py-2 bg-red-500/15 border border-red-400/30 text-red-300 text-xs">
                {error}
              </div>
            )}
            <div ref={listEndRef} />
          </div>

          {canUseAI && (
            <div
              className="p-3 shrink-0"
              style={{
                borderTop: isAgent ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid rgba(6, 182, 212, 0.15)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAttachImage}
                aria-label="Đính kèm ảnh"
              />
              {attachmentImage && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 p-2">
                  <img
                    src={`data:${attachmentImage.type};base64,${attachmentImage.base64}`}
                    alt="Đính kèm"
                    className="h-12 w-12 rounded object-cover"
                  />
                  <span className="text-xs text-gray-400 flex-1">Ảnh sẽ gửi kèm tin tiếp theo</span>
                  <button
                    type="button"
                    onClick={() => setAttachmentImage(null)}
                    className="text-gray-400 hover:text-white text-sm"
                    aria-label="Bỏ ảnh"
                  >
                    ×
                  </button>
                </div>
              )}
              <div
                className={`flex gap-2 items-end rounded-xl border transition-colors ${
                  isAgent
                    ? 'bg-black/30 border-violet-400/20 focus-within:border-violet-400/40'
                    : 'bg-black/30 border-cyan-400/20 focus-within:border-cyan-400/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 m-2 w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Đính kèm ảnh (hội thoại đa phương thức)"
                  aria-label="Đính kèm ảnh"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isAgent ? 'Hỏi "mở bài X", "xem Khám phá 540 Ma"...' : 'Hỏi về Trái Đất, hóa thạch, thiên văn...'}
                  rows={1}
                  className="flex-1 min-h-[44px] max-h-28 resize-none bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading || (!input.trim() && !attachmentImage)}
                  className="shrink-0 m-2 w-9 h-9 rounded-lg flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  style={
                    isAgent
                      ? { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }
                      : { background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }
                  }
                  aria-label="Gửi"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              {messages.length > MAX_MESSAGES_FOR_API && (
                <p className="text-[10px] text-amber-500/90 mt-1 text-center">
                  Chỉ gửi {MAX_MESSAGES_FOR_API} tin gần nhất để tiết kiệm bộ nhớ (máy local).
                </p>
              )}
              <p className="text-[10px] text-gray-500 mt-1.5 text-center">Shift+Enter xuống dòng · Enter gửi</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
