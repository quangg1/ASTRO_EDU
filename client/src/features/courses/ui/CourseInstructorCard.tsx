'use client'

import type { PublicTeacherProfile } from '@/features/auth/public'
import { resolveMediaUrl } from '@/lib/apiConfig'

export function CourseInstructorCard({ teacher }: { teacher: PublicTeacherProfile }) {
  const avatar = teacher.avatarUrl ? resolveMediaUrl(teacher.avatarUrl) : null
  return (
    <section className="rounded-2xl border border-ds-border bg-ds-overlay p-5 md:p-6">
      <p className="text-[11px] uppercase tracking-wider text-ds-subtle mb-3">Giảng viên · xác minh</p>
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
        <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-ds-border bg-ds-elevated/80 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-semibold text-ds-accent">
              {(teacher.fullName || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{teacher.fullName}</h3>
            {teacher.verified ? (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                Đã xác minh
              </span>
            ) : null}
          </div>
          {teacher.headline ? <p className="text-sm text-ds-muted mt-0.5">{teacher.headline}</p> : null}
          {teacher.organization ? (
            <p className="text-xs text-ds-subtle mt-1">{teacher.organization}</p>
          ) : null}
          {teacher.expertise?.length ? (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {teacher.expertise.slice(0, 8).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-md border border-ds-border text-ds-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {teacher.bio ? (
            <p className="text-sm text-gray-300 mt-3 leading-relaxed line-clamp-4 whitespace-pre-wrap">
              {teacher.bio}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 mt-3 text-xs">
            {teacher.yearsExperience != null && teacher.yearsExperience > 0 ? (
              <span className="text-ds-subtle">{teacher.yearsExperience}+ năm kinh nghiệm</span>
            ) : null}
            {teacher.email ? (
              <span className="text-ds-subtle truncate max-w-[240px]" title={teacher.email}>
                {teacher.email}
              </span>
            ) : null}
            {teacher.website ? (
              <a
                href={teacher.website.startsWith('http') ? teacher.website : `https://${teacher.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ds-accent hover:underline"
              >
                Website
              </a>
            ) : null}
            {teacher.linkedin ? (
              <a
                href={teacher.linkedin.startsWith('http') ? teacher.linkedin : `https://${teacher.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ds-accent hover:underline"
              >
                LinkedIn
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
