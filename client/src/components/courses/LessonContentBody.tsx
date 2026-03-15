'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Lesson, LessonSection, ResourceLink } from '@/lib/coursesApi'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { getStageByTime } from '@/lib/earthHistoryData'
import { FeaturedOrganisms } from '@/components/ui/FeaturedOrganisms'
import { Loading } from '@/components/ui/Loading'

type LessonTab = 'video' | 'readings' | 'resources'
const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), { ssr: false, loading: () => <Loading /> })
const ModelViewer = dynamic(() => import('@/components/studio/ModelViewer'), { ssr: false, loading: () => <Loading /> })
const MathBlock = dynamic(() => import('@/components/studio/blocks/MathBlock'), { ssr: false })
const ChartBlock = dynamic(() => import('@/components/studio/blocks/ChartBlock'), { ssr: false })
const SliderBlock = dynamic(() => import('@/components/studio/blocks/SliderBlock'), { ssr: false })

function renderTextWithBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, idx) => {
    const key = `${idx}-${p.slice(0, 20)}`
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={key}>{p.slice(2, -2)}</strong>
    }
    return <span key={key}>{p}</span>
  })
}

function formatContent(text: string) {
  return text
    .replace(/\s●\s/g, '\n• ')
    .replace(/\s-\s/g, '\n- ')
    .replace(/\s([0-9]{1,2}\.)\s/g, '\n$1 ')
}

function isVideoSection(sec: LessonSection) {
  return sec.type === 'video' && !!sec.videoUrl
}

function getResourceLabel(link: ResourceLink, idx: number) {
  if (link.label && link.label.trim().length > 0) return link.label
  return `Tài nguyên ${idx + 1}`
}

export function LessonContentBody({ lesson }: { lesson: Lesson }) {
  const [tab, setTab] = useState<LessonTab>(lesson.videoUrl ? 'video' : 'readings')

  useEffect(() => {
    setTab(lesson.videoUrl ? 'video' : 'readings')
  }, [lesson.slug, lesson.videoUrl])

  const sections = (lesson.sections ?? []) as LessonSection[]
  const videoSections = useMemo(() => sections.filter(isVideoSection), [sections])
  const readingSections = useMemo(() => sections.filter((s) => !isVideoSection(s)), [sections])
  const learningGoals = lesson.learningGoals && lesson.learningGoals.length > 0
  const gallery = lesson.galleryImages ?? []
  const resources = lesson.resourceLinks ?? []

  const showVideoTab = !!lesson.videoUrl || videoSections.length > 0

  return (
    <div className="p-6 space-y-6 w-full">
      {lesson.coverImage && (
        <section className="rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#08111f]">
          <div className="relative w-full h-56 md:h-72">
            <img src={lesson.coverImage} alt={lesson.title} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2 className="text-xl md:text-2xl font-semibold text-white">{lesson.title}</h2>
              {lesson.description && (
                <p className="text-sm text-gray-300 mt-1 line-clamp-2">{lesson.description}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-[#0a0f17] p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Thư viện hình ảnh</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gallery.map((img, idx) => (
              <img
                key={`${img}-${idx}`}
                src={img}
                alt={`${lesson.title} gallery ${idx + 1}`}
                className="w-full h-24 md:h-28 object-cover rounded-lg border border-white/10"
              />
            ))}
          </div>
        </section>
      )}

      {/* Video section - always visible when present */}
      {showVideoTab && (
        <div className="space-y-4">
          {lesson.videoUrl && (
            <section className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-lg">
              <div className="w-full aspect-video">
                {lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be') ? (
                  <iframe
                    className="w-full h-full"
                    src={resolveMediaUrl(lesson.videoUrl)}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video className="w-full h-full" controls src={resolveMediaUrl(lesson.videoUrl)}>
                    Video not supported.
                  </video>
                )}
              </div>
            </section>
          )}

          {videoSections.map((sec, idx) => (
            <section key={`${sec.title ?? 'video'}-${idx}`} className="rounded-xl border border-white/10 bg-[#0a0f17] p-4 space-y-3">
              <h3 className="text-white font-medium">{sec.title || `Video ${idx + 1}`}</h3>
              {sec.content && <p className="text-sm text-gray-400">{sec.content}</p>}
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10">
                {sec.videoUrl && (sec.videoUrl.includes('youtube.com') || sec.videoUrl.includes('youtu.be')) ? (
                  <iframe className="w-full h-full" src={resolveMediaUrl(sec.videoUrl)} title={sec.title || 'Video'} allowFullScreen />
                ) : (
                  <video className="w-full h-full" controls src={resolveMediaUrl(sec.videoUrl)}>Video not supported.</video>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Readings - always visible below video */}
      {(
        <>
          {(lesson.sourcePdf || lesson.sourcePageCount != null) && (
            <section className="rounded-lg bg-white/5 border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Nguồn nội dung PDF</h3>
              <p className="text-sm text-gray-400">
                {lesson.sourcePdf ? `File: ${lesson.sourcePdf}` : 'File: không xác định'}
                {lesson.sourcePageCount != null ? ` · ${lesson.sourcePageCount} trang` : ''}
              </p>
            </section>
          )}

          {learningGoals && (
            <section className="rounded-xl bg-cyan-950/30 border border-cyan-500/20 p-5">
              <h3 className="text-sm font-semibold text-cyan-300 mb-2">Mục tiêu học tập</h3>
              <ul className="list-disc list-inside text-gray-200 text-sm md:text-[15px] space-y-2 leading-relaxed">
                {lesson.learningGoals?.map((goal, i) => (
                  <li key={i}>{goal}</li>
                ))}
              </ul>
            </section>
          )}

          {lesson.stageTime != null && (
            <section className="rounded-xl border border-cyan-500/20 bg-[#08111f] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-cyan-300">Mô phỏng 3D trong bài học</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {(() => {
                    const stage = getStageByTime(lesson.stageTime ?? 0)
                    return stage ? `${stage.timeDisplay} · ${stage.description}` : `Mốc ${lesson.stageTime} Ma`
                  })()}
                </p>
              </div>
              {(() => {
                const stage = getStageByTime(lesson.stageTime ?? 0)
                return (
                  <>
                    {stage && (
                      <div className="px-4 py-3 border-b border-white/10">
                        <FeaturedOrganisms stageId={stage.id} variant="compact" />
                      </div>
                    )}
                    <div className="h-[380px]">
                      <EarthScene overrideStage={stage} />
                    </div>
                  </>
                )
              })()}
            </section>
          )}

          {readingSections.length > 0 ? (
            <div className="space-y-6">
              {readingSections.map((sec, i) => (
                <section key={`${sec.title ?? 'sec'}-${i}`} className="space-y-3 rounded-xl border border-white/10 bg-[#0a0f17] p-5">
                  {sec.title && (
                    <h3 className="text-base md:text-lg font-semibold text-white border-b border-white/10 pb-2">
                      {i + 1}. {sec.title}
                    </h3>
                  )}
                  {sec.type === 'text' && sec.content && (
                    <div className="space-y-3">
                      {sec.summary && (
                        <p className="text-cyan-100/90 text-sm md:text-[15px] leading-7 font-medium">
                          {sec.summary}
                        </p>
                      )}
                      {sec.bullets && sec.bullets.length > 0 && (
                        <ul className="list-disc list-inside text-gray-200 text-sm md:text-[15px] space-y-1 leading-7">
                          {sec.bullets.map((b, bi) => (
                            <li key={`${bi}-${b.slice(0, 20)}`}>{b}</li>
                          ))}
                        </ul>
                      )}
                      <details className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <summary className="cursor-pointer text-sm text-cyan-300">Xem chi tiết slide</summary>
                        <div className="mt-3 text-gray-300 text-sm md:text-[15px] leading-7 whitespace-pre-wrap">
                          {renderTextWithBold(formatContent(sec.content))}
                        </div>
                      </details>
                    </div>
                  )}
                  {sec.type === 'image' && sec.imageUrl && (
                    <figure className="my-3">
                      <img
                        src={resolveMediaUrl(sec.imageUrl)}
                        alt={sec.title || 'Hình minh họa'}
                        className="rounded-xl w-full max-h-[460px] object-cover border border-white/10"
                      />
                      {sec.content && <figcaption className="text-xs text-gray-500 mt-2">{sec.content}</figcaption>}
                    </figure>
                  )}
                  {sec.type === '3d' && sec.modelUrl && (
                    <div className="my-3 h-[400px] rounded-xl border border-cyan-500/20 overflow-hidden bg-black/50">
                      <ModelViewer url={resolveMediaUrl(sec.modelUrl)} />
                    </div>
                  )}
                  {sec.type === 'richtext' && (sec.html || sec.content) && (
                    <div
                      className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_a]:text-cyan-400 [&_blockquote]:border-l-cyan-500/40 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_img]:rounded-xl"
                      dangerouslySetInnerHTML={{ __html: sec.html || sec.content || '' }}
                    />
                  )}
                  {sec.type === 'code' && sec.code && (
                    <div className="rounded-xl border border-white/10 bg-black/60 overflow-hidden my-3">
                      <div className="px-3 py-1.5 border-b border-white/10">
                        <span className="text-[10px] uppercase tracking-wider text-gray-600">{sec.language || 'code'}</span>
                      </div>
                      <pre className="p-4 text-sm font-mono text-gray-200 overflow-x-auto leading-relaxed"><code>{sec.code}</code></pre>
                    </div>
                  )}
                  {sec.type === 'callout' && sec.content && (
                    <div className={`rounded-xl border p-4 my-3 ${
                      sec.calloutVariant === 'tip' ? 'border-emerald-500/40 bg-emerald-500/10' :
                      sec.calloutVariant === 'warning' ? 'border-amber-500/40 bg-amber-500/10' :
                      sec.calloutVariant === 'danger' ? 'border-red-500/40 bg-red-500/10' :
                      'border-cyan-500/40 bg-cyan-500/10'
                    }`}>
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{sec.content}</p>
                    </div>
                  )}
                  {sec.type === 'embed' && sec.embedUrl && (
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10 my-3">
                      <iframe src={sec.embedUrl} className="w-full h-full" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups" />
                    </div>
                  )}
                  {sec.type === 'divider' && (
                    <div className="flex items-center gap-4 py-2 my-3">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>
                  )}
                  {sec.type === 'math' && sec.latex && (
                    <div className="my-3 rounded-xl border border-white/10 bg-black/30 p-6 flex justify-center">
                      <MathBlock latex={sec.latex} displayMode />
                    </div>
                  )}
                  {sec.type === 'chart' && (
                    <div className="my-3 rounded-xl border border-cyan-500/20 overflow-hidden bg-black/30 p-4">
                      <ChartBlock section={sec} update={() => {}} />
                    </div>
                  )}
                  {sec.type === 'slider' && (
                    <div className="my-3">
                      <SliderBlock section={sec} update={() => {}} />
                    </div>
                  )}
                  {sec.type === 'observable' && sec.notebookUrl && (
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10 my-3">
                      <iframe
                        src={sec.notebookUrl.replace('observablehq.com/', 'observablehq.com/embed/')}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Chưa có nội dung đọc cho bài này.</div>
          )}
        </>
      )}

      {/* Resources - collapsible at bottom */}
      {resources.length > 0 && (
        <details className="rounded-xl border border-white/10 bg-[#0a0f17] overflow-hidden">
          <summary className="px-5 py-3 text-sm font-semibold text-white cursor-pointer hover:bg-white/5 transition-colors">
            Resources ({resources.length})
          </summary>
          <div className="px-5 pb-4 space-y-2">
            {resources.map((link, idx) => (
              <a
                key={`${link.url}-${idx}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:border-cyan-500/40 hover:bg-cyan-500/10"
              >
                <span className="font-medium text-cyan-300">[{link.kind}]</span> {getResourceLabel(link, idx)}
                <div className="text-xs text-gray-500 truncate mt-1">{link.url}</div>
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
