'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { Lesson, LessonSection, ResourceLink } from '@/features/courses/api/coursesApi'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { useNarrativeSpace } from '@/features/content3d/narrative/public'
import { FeaturedOrganisms } from '@/components/ui/FeaturedOrganisms'
import { Loading } from '@/components/ui/Loading'
import { SectionPreview } from '@/components/studio/LessonPreview'

const EarthScene = dynamic(() => import('@/components/3d/EarthScene'), { ssr: false, loading: () => <Loading /> })

function isVideoSection(sec: LessonSection) {
  return sec.type === 'video' && !!sec.videoUrl
}

function getResourceLabel(link: ResourceLink, idx: number) {
  if (link.label && link.label.trim().length > 0) return link.label
  return `Tài nguyên ${idx + 1}`
}

export function LessonContentBody({ lesson }: { lesson: Lesson }) {
  const { getBeatByRef } = useNarrativeSpace('earth-history')
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
                    const stage = getBeatByRef.byTime(lesson.stageTime ?? 0)
                    return stage ? `${stage.timeDisplay} · ${stage.description}` : `Mốc ${lesson.stageTime} Ma`
                  })()}
                </p>
              </div>
              {(() => {
                const stage = getBeatByRef.byTime(lesson.stageTime ?? 0)
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
                <section
                  key={`${sec.type}-${sec.title ?? 'sec'}-${i}`}
                  className="rounded-xl border border-white/10 bg-[#0a0f17] p-5"
                >
                  <SectionPreview sec={sec} index={i} />
                </section>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Chưa có nội dung đọc cho bài này.</div>
          )}
        </>
      )}

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
