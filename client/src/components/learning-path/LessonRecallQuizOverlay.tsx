'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { RecallQuizDeliveryQuestion, RecallQuizSubmitResult } from '@/features/learning-path/public'
import { LessonRecallQuiz } from '@/components/learning-path/LessonRecallQuiz'

type Props = {
  open: boolean
  onClose: () => void
  lessonTitle: string
  questions: RecallQuizDeliveryQuestion[]
  passed: boolean
  onPassed: () => void
  onSubmit: (answers: Record<string, number>) => Promise<RecallQuizSubmitResult>
  onQuizFailed?: () => void
  /** Khi true, không cho đóng overlay (chưa làm quiz) */
  gateActive?: boolean
  loadError?: string | null
}

export function LessonRecallQuizOverlay({
  open,
  onClose,
  lessonTitle,
  questions,
  passed,
  onPassed,
  onSubmit,
  onQuizFailed,
  gateActive = false,
  loadError = null,
}: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (gateActive && !passed) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, gateActive, passed, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recall-quiz-overlay-title"
          className="fixed inset-0 z-[100] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Lớp nền — đóng kiểm tra"
            className="absolute inset-0 bg-[#030712]/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (gateActive && !passed) return
              onClose()
            }}
          />

          <motion.div
            className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-10 pointer-events-none"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <motion.div
              className="pointer-events-auto flex w-full max-w-xl max-h-[min(92vh,720px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c1224] to-[#060a14] shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_60px_rgba(34,211,238,0.12)]"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-6">
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <p id="recall-quiz-overlay-title" className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-400/90">
                    Kiểm tra sau bài học
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200 line-clamp-2">{lessonTitle}</p>
                </motion.div>
                {(!gateActive || passed) && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="Đóng kiểm tra"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </header>

              <motion.div
                className="flex min-h-0 flex-1 flex-col overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
              >
                {loadError && questions.length < 3 ? (
                  <p className="px-6 py-10 text-center text-sm text-rose-300">{loadError}</p>
                ) : (
                  <LessonRecallQuiz
                    variant="overlay"
                    questions={questions}
                    passed={passed}
                    onPassed={onPassed}
                    onSubmit={onSubmit}
                    onQuizFailed={onQuizFailed}
                    onContinue={onClose}
                  />
                )}
              </motion.div>
            </motion.div>

            {gateActive && !passed ? (
              <p className="pointer-events-none mt-4 text-center text-[11px] text-slate-400/90 max-w-sm">
                Hoàn thành kiểm tra để ghi nhận <span className="text-violet-300">Đã nắm</span>. Trợ lý AI tắt trong lúc làm bài.
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
