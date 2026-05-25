'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { Lesson, LessonSection, QuizQuestion } from '@/features/courses/api/coursesApi'
import { mcqAnswerIndex, mcqOptionTexts } from '@/shared/types/quizQuestion'
import type { LearningConcept, LessonConceptAnchor } from '@/data/learningPathCurriculum'
import { lessonPreviewFromCourseLesson, type LessonPreviewContract } from '@/components/studio/lessonPreviewTypes'
import { applyConceptAnchorsToHtml } from '@/features/concepts/public'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { earthHistoryData, findStageByTime, useCourseStageFossils } from '@/features/content3d/earth/public'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-ds-subtle text-sm">Loading 3D scene...</div> })

function CourseEarthSceneBlock({ stageTime }: { stageTime: number }) {
  const stage = findStageByTime(earthHistoryData, stageTime)
  const fossils = useCourseStageFossils(stage ?? null)
  return (
    <div className="rounded-xl border border-ds-accent-strong bg-ds-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-ds-border">
        <h3 className="text-sm font-semibold text-ds-accent">3D Earth Simulation</h3>
        <p className="text-xs text-ds-muted mt-1">
          {stage ? `${stage.timeDisplay} · ${stage.description}` : `Stage ${stageTime} Ma`}
        </p>
      </div>
      <div className="h-[380px]">
        <EarthScene overrideStage={stage} overrideFossils={fossils} />
      </div>
    </div>
  )
}
const ModelViewer = dynamic(() => import('@/components/studio/ModelViewer'), { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-ds-subtle text-sm">Loading 3D model...</div> })
const MathBlock = dynamic(() => import('@/components/studio/blocks/MathBlock'), { ssr: false })
const ChartBlock = dynamic(() => import('@/components/studio/blocks/ChartBlock'), { ssr: false })
const SliderBlock = dynamic(() => import('@/components/studio/blocks/SliderBlock'), { ssr: false })

const CALLOUT_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  info: { border: 'border-ds-accent-strong', bg: 'bg-ds-accent-soft', icon: '\u2139\uFE0F' },
  tip: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', icon: '\u2705' },
  warning: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', icon: '\u26A0\uFE0F' },
  danger: { border: 'border-red-500/40', bg: 'bg-red-500/10', icon: '\u274C' },
}

type SectionPreviewProps = {
  sec: LessonSection
  /** Learning Path: highlight cụm → concept (giống trang học bài) */
  conceptAnchors?: LessonConceptAnchor[]
  concepts?: LearningConcept[]
}

/** Dùng chung Course + Learning Path — render một block */
export function SectionPreview({ sec, conceptAnchors, concepts }: SectionPreviewProps) {
  const conceptMap = useMemo(() => {
    if (!concepts?.length) return null
    return new Map(concepts.map((c) => [c.id, c] as const))
  }, [concepts])
  const imageWidthPct = Number.isFinite(sec.imageWidthPct) ? Math.min(100, Math.max(20, Number(sec.imageWidthPct))) : 100

  switch (sec.type) {
    case 'richtext': {
      const raw = sec.html || sec.content || ''
      const html =
        conceptAnchors?.length && conceptMap
          ? applyConceptAnchorsToHtml(raw, conceptAnchors, conceptMap)
          : raw
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          <div
            className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed [&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_a]:text-ds-accent [&_blockquote]:border-l-cyan-500/40 [&_blockquote]:text-ds-muted [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_img]:rounded-xl [&_img]:max-h-80 [&_img]:mx-auto [&_img]:block [&_img]:w-auto [&_img]:max-w-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )
    }

    case 'text':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          {sec.summary && <p className="text-cyan-100/90 text-sm leading-7 font-medium">{sec.summary}</p>}
          {sec.bullets && sec.bullets.length > 0 && (
            <ul className="list-disc list-inside text-gray-200 text-sm space-y-1 leading-7">
              {sec.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
          {sec.content && <p className="text-gray-300 text-sm leading-7 whitespace-pre-wrap">{sec.content}</p>}
        </div>
      )

    case 'image':
    case 'gif':
      return (
        <figure className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          {sec.imageUrl ? (
            <img
              src={sec.imageUrl}
              alt={sec.title || ''}
              className="block mx-auto w-auto max-w-full max-h-[400px] object-contain rounded-xl border border-ds-border"
              style={{ maxWidth: `${imageWidthPct}%` }}
            />
          ) : (
            <div className="w-full h-40 rounded-xl border border-dashed border-ds-border-strong flex items-center justify-center text-ds-subtle text-sm">No image set</div>
          )}
          {sec.caption && <figcaption className="text-xs text-ds-subtle text-center">{sec.caption}</figcaption>}
        </figure>
      )

    case 'video':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          {sec.videoUrl ? (
            <div className="aspect-video rounded-xl overflow-hidden border border-ds-border bg-black/50">
              {(sec.videoUrl.includes('youtube.com') || sec.videoUrl.includes('youtu.be')) ? (
                <iframe src={sec.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen />
              ) : (
                <video src={sec.videoUrl} controls className="w-full h-full" />
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-dashed border-ds-border-strong flex items-center justify-center text-ds-subtle text-sm">No video set</div>
          )}
          {sec.caption && <p className="text-xs text-ds-subtle">{sec.caption}</p>}
        </div>
      )

    case 'code':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          <div className="rounded-xl border border-ds-border bg-black/60 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-ds-border flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-ds-subtle">{sec.language || 'code'}</span>
            </div>
            <pre className="p-4 text-sm font-mono text-gray-200 overflow-x-auto leading-relaxed"><code>{sec.code || ''}</code></pre>
          </div>
        </div>
      )

    case 'embed':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          {sec.embedUrl ? (
            <div className="aspect-video rounded-xl overflow-hidden border border-ds-border">
              <iframe src={sec.embedUrl} className="w-full h-full" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups" />
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-dashed border-ds-border-strong flex items-center justify-center text-ds-subtle text-sm">No embed URL set</div>
          )}
        </div>
      )

    case '3d':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          {sec.modelUrl ? (
            <div className="h-[350px] rounded-xl border border-ds-accent-strong overflow-hidden bg-black/50">
              <ModelViewer url={resolveMediaUrl(sec.modelUrl)} />
            </div>
          ) : (
            <div className="h-[200px] rounded-xl border border-dashed border-ds-border-strong flex items-center justify-center text-ds-subtle text-sm">No 3D model set</div>
          )}
          {sec.caption && <p className="text-xs text-ds-subtle">{sec.caption}</p>}
        </div>
      )

    case 'callout': {
      const variant = sec.calloutVariant || 'info'
      const style = CALLOUT_STYLES[variant] || CALLOUT_STYLES.info
      return (
        <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
          <div className="flex items-start gap-2">
            <span className="text-lg">{style.icon}</span>
            <div className="flex-1">
              {sec.title && <p className="text-sm font-semibold text-white mb-1">{sec.title}</p>}
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{sec.content || ''}</p>
            </div>
          </div>
        </div>
      )
    }

    case 'divider':
      return (
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )

    case 'math':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          {sec.latex ? (
            <div className="rounded-xl border border-ds-border bg-black/30 p-6 flex justify-center">
              <MathBlock latex={sec.latex} displayMode />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-ds-border-strong p-6 text-center text-ds-subtle text-sm">No LaTeX set</div>
          )}
        </div>
      )

    case 'chart':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-xl font-semibold tracking-tight text-white mb-2">{sec.title}</h3>}
          <div className="rounded-xl border border-ds-accent-strong overflow-hidden bg-black/30 p-4">
            <ChartBlock section={sec} update={() => {}} />
          </div>
        </div>
      )

    case 'slider':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          <SliderBlock section={sec} update={() => {}} />
        </div>
      )

    case 'observable':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          {sec.notebookUrl ? (
            <div className="aspect-video rounded-xl overflow-hidden border border-ds-border">
              <iframe
                src={sec.notebookUrl.replace('observablehq.com/', 'observablehq.com/embed/')}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-dashed border-ds-border-strong flex items-center justify-center text-ds-subtle text-sm">No Observable URL set</div>
          )}
        </div>
      )

    default:
      return <p className="text-ds-subtle text-sm">Unknown block type: {sec.type}</p>
  }
}

function QuizPreview({ questions }: { questions: QuizQuestion[] }) {
  if (!questions.length) return <p className="text-ds-subtle text-sm">No quiz questions.</p>
  return (
    <div className="space-y-4">
      {questions.map((q, qi) => {
        const answerIdx = mcqAnswerIndex(q)
        const opts = mcqOptionTexts(q)
        return (
        <div key={q.id || qi} className="rounded-xl border border-ds-border bg-ds-surface p-4 space-y-3">
          <p className="text-sm font-semibold text-white"><span className="text-ds-accent mr-2">Q{qi + 1}.</span>{q.question || '(empty question)'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
            {opts.map((opt, oi) => (
              <div key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${answerIdx === oi ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-ds-border text-gray-300'}`}>
                <span className="text-xs font-bold w-5">{String.fromCharCode(65 + oi)}.</span>
                <span>{opt || '(empty)'}</span>
                {answerIdx === oi && <span className="ml-auto text-emerald-400 text-xs">\u2713 correct</span>}
              </div>
            ))}
          </div>
        </div>
      )})}
    </div>
  )
}

/** Preview contract — `lesson` carries sections/quiz; LP/Course enrichments optional. */
export type LessonPreviewProps = {
  lesson: Lesson
} & Pick<LessonPreviewContract, 'conceptAnchors' | 'concepts'>

export default function LessonPreview({ lesson, conceptAnchors, concepts }: LessonPreviewProps) {
  const preview = lessonPreviewFromCourseLesson(lesson)
  const sections = preview.sections
  const quizQuestions = preview.quizQuestions ?? []
  const goals = preview.learningGoals ?? []
  const showConceptStyles = !!(conceptAnchors?.length && concepts?.length)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden border border-ds-border bg-gradient-to-br from-[#0a1628] to-[#0a0f17]">
        {lesson.coverImage && (
          <div className="relative w-full h-44">
            <img src={lesson.coverImage} alt="" className="w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f17] via-transparent to-transparent" />
          </div>
        )}
        <div className={`p-5 ${lesson.coverImage ? '-mt-12 relative' : ''}`}>
          <h1 className="text-xl font-bold text-white">{lesson.title || 'Untitled Lesson'}</h1>
          {lesson.description && <p className="text-sm text-ds-muted mt-1">{lesson.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-ds-subtle">
            <span>Week {lesson.week ?? '-'}</span>
            <span>&middot;</span>
            <span>{sections.length} blocks</span>
            {quizQuestions.length > 0 && <><span>&middot;</span><span>{quizQuestions.length} quiz questions</span></>}
          </div>
        </div>
      </div>

      {/* Learning goals */}
      {goals.length > 0 && (
        <div className="rounded-xl border border-ds-accent-strong bg-cyan-950/20 p-4">
          <h3 className="text-sm font-semibold text-ds-accent mb-2">Learning Goals</h3>
          <ul className="list-disc list-inside text-gray-200 text-sm space-y-1">
            {goals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      {/* Video */}
      {lesson.videoUrl && (
        <div className="aspect-video rounded-xl overflow-hidden border border-ds-border bg-black/50">
          {(lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be')) ? (
            <iframe src={lesson.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen />
          ) : (
            <video src={lesson.videoUrl} controls className="w-full h-full" />
          )}
        </div>
      )}

      {/* Earth History 3D Simulation */}
      {lesson.stageTime != null && <CourseEarthSceneBlock stageTime={lesson.stageTime} />}

      {/* Sections */}
      {sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((sec, i) => (
            <div key={i} className="rounded-xl border border-ds-border bg-ds-surface p-5">
              <SectionPreview
                sec={sec}
                conceptAnchors={conceptAnchors}
                concepts={concepts}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ds-subtle text-center py-8">No blocks yet. Add blocks in the editor.</p>
      )}

      {/* Quiz */}
      {quizQuestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Quiz</h3>
          <QuizPreview questions={quizQuestions} />
        </div>
      )}

      {showConceptStyles ? (
        <style jsx global>{`
          .lp-concept-inline {
            background: rgba(34, 211, 238, 0.14);
            border: 1px solid rgba(34, 211, 238, 0.35);
            color: #a5f3fc;
            border-radius: 6px;
            padding: 0 4px;
            cursor: default;
            pointer-events: none;
          }
        `}</style>
      ) : null}
    </div>
  )
}
