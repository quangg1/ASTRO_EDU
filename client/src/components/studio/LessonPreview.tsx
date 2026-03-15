'use client'

import dynamic from 'next/dynamic'
import type { Lesson, LessonSection, QuizQuestion } from '@/lib/coursesApi'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { getStageByTime } from '@/lib/earthHistoryData'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-gray-600 text-sm">Loading 3D scene...</div> })
const ModelViewer = dynamic(() => import('@/components/studio/ModelViewer'), { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-gray-600 text-sm">Loading 3D model...</div> })
const MathBlock = dynamic(() => import('@/components/studio/blocks/MathBlock'), { ssr: false })
const ChartBlock = dynamic(() => import('@/components/studio/blocks/ChartBlock'), { ssr: false })
const SliderBlock = dynamic(() => import('@/components/studio/blocks/SliderBlock'), { ssr: false })

const CALLOUT_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  info: { border: 'border-cyan-500/40', bg: 'bg-cyan-500/10', icon: '\u2139\uFE0F' },
  tip: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', icon: '\u2705' },
  warning: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', icon: '\u26A0\uFE0F' },
  danger: { border: 'border-red-500/40', bg: 'bg-red-500/10', icon: '\u274C' },
}

function SectionPreview({ sec, index }: { sec: LessonSection; index: number }) {
  switch (sec.type) {
    case 'richtext':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{index + 1}. {sec.title}</h3>}
          <div
            className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_a]:text-cyan-400 [&_blockquote]:border-l-cyan-500/40 [&_blockquote]:text-gray-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_img]:rounded-xl [&_img]:max-h-80"
            dangerouslySetInnerHTML={{ __html: sec.html || sec.content || '' }}
          />
        </div>
      )

    case 'text':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{index + 1}. {sec.title}</h3>}
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
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          {sec.imageUrl ? (
            <img src={sec.imageUrl} alt={sec.title || ''} className="w-full max-h-[400px] object-contain rounded-xl border border-white/10" />
          ) : (
            <div className="w-full h-40 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-600 text-sm">No image set</div>
          )}
          {sec.caption && <figcaption className="text-xs text-gray-500 text-center">{sec.caption}</figcaption>}
        </figure>
      )

    case 'video':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          {sec.videoUrl ? (
            <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/50">
              {(sec.videoUrl.includes('youtube.com') || sec.videoUrl.includes('youtu.be')) ? (
                <iframe src={sec.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen />
              ) : (
                <video src={sec.videoUrl} controls className="w-full h-full" />
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-600 text-sm">No video set</div>
          )}
          {sec.caption && <p className="text-xs text-gray-500">{sec.caption}</p>}
        </div>
      )

    case 'code':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          <div className="rounded-xl border border-white/10 bg-black/60 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-gray-600">{sec.language || 'code'}</span>
            </div>
            <pre className="p-4 text-sm font-mono text-gray-200 overflow-x-auto leading-relaxed"><code>{sec.code || ''}</code></pre>
          </div>
        </div>
      )

    case 'embed':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          {sec.embedUrl ? (
            <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
              <iframe src={sec.embedUrl} className="w-full h-full" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups" />
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-600 text-sm">No embed URL set</div>
          )}
        </div>
      )

    case '3d':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          {sec.modelUrl ? (
            <div className="h-[350px] rounded-xl border border-cyan-500/20 overflow-hidden bg-black/50">
              <ModelViewer url={resolveMediaUrl(sec.modelUrl)} />
            </div>
          ) : (
            <div className="h-[200px] rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-600 text-sm">No 3D model set</div>
          )}
          {sec.caption && <p className="text-xs text-gray-500">{sec.caption}</p>}
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
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          {sec.latex ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-6 flex justify-center">
              <MathBlock latex={sec.latex} displayMode />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/20 p-6 text-center text-gray-600 text-sm">No LaTeX set</div>
          )}
        </div>
      )

    case 'chart':
      return (
        <div className="space-y-2">
          {sec.title && <h3 className="text-base font-semibold text-white">{sec.title}</h3>}
          <div className="rounded-xl border border-cyan-500/20 overflow-hidden bg-black/30 p-4">
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
            <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
              <iframe
                src={sec.notebookUrl.replace('observablehq.com/', 'observablehq.com/embed/')}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-600 text-sm">No Observable URL set</div>
          )}
        </div>
      )

    default:
      return <p className="text-gray-500 text-sm">Unknown block type: {sec.type}</p>
  }
}

function QuizPreview({ questions }: { questions: QuizQuestion[] }) {
  if (!questions.length) return <p className="text-gray-500 text-sm">No quiz questions.</p>
  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={qi} className="rounded-xl border border-white/10 bg-[#0a0f17] p-4 space-y-3">
          <p className="text-sm font-semibold text-white"><span className="text-cyan-400 mr-2">Q{qi + 1}.</span>{q.question || '(empty question)'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
            {(q.options || []).map((opt, oi) => (
              <div key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${q.correctIndex === oi ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 text-gray-300'}`}>
                <span className="text-xs font-bold w-5">{String.fromCharCode(65 + oi)}.</span>
                <span>{opt || '(empty)'}</span>
                {q.correctIndex === oi && <span className="ml-auto text-emerald-400 text-xs">\u2713 correct</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LessonPreview({ lesson }: { lesson: Lesson }) {
  const sections = lesson.sections ?? []
  const quizQuestions = lesson.quizQuestions ?? []
  const goals = lesson.learningGoals ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0a1628] to-[#0a0f17]">
        {lesson.coverImage && (
          <div className="relative w-full h-44">
            <img src={lesson.coverImage} alt="" className="w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f17] via-transparent to-transparent" />
          </div>
        )}
        <div className={`p-5 ${lesson.coverImage ? '-mt-12 relative' : ''}`}>
          <h1 className="text-xl font-bold text-white">{lesson.title || 'Untitled Lesson'}</h1>
          {lesson.description && <p className="text-sm text-gray-400 mt-1">{lesson.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-600">
            <span>Week {lesson.week ?? '-'}</span>
            <span>&middot;</span>
            <span>{sections.length} blocks</span>
            {quizQuestions.length > 0 && <><span>&middot;</span><span>{quizQuestions.length} quiz questions</span></>}
          </div>
        </div>
      </div>

      {/* Learning goals */}
      {goals.length > 0 && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
          <h3 className="text-sm font-semibold text-cyan-300 mb-2">Learning Goals</h3>
          <ul className="list-disc list-inside text-gray-200 text-sm space-y-1">
            {goals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      {/* Video */}
      {lesson.videoUrl && (
        <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/50">
          {(lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be')) ? (
            <iframe src={lesson.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen />
          ) : (
            <video src={lesson.videoUrl} controls className="w-full h-full" />
          )}
        </div>
      )}

      {/* Earth History 3D Simulation */}
      {lesson.stageTime != null && (() => {
        const stage = getStageByTime(lesson.stageTime ?? 0)
        return (
          <div className="rounded-xl border border-cyan-500/20 bg-[#08111f] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-cyan-300">3D Earth Simulation</h3>
              <p className="text-xs text-gray-400 mt-1">
                {stage ? `${stage.timeDisplay} \u00B7 ${stage.description}` : `Stage ${lesson.stageTime} Ma`}
              </p>
            </div>
            <div className="h-[380px]">
              <EarthScene overrideStage={stage} />
            </div>
          </div>
        )
      })()}

      {/* Sections */}
      {sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((sec, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-[#0a0f17] p-5">
              <SectionPreview sec={sec} index={i} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600 text-center py-8">No blocks yet. Add blocks in the editor.</p>
      )}

      {/* Quiz */}
      {quizQuestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Quiz</h3>
          <QuizPreview questions={quizQuestions} />
        </div>
      )}
    </div>
  )
}
