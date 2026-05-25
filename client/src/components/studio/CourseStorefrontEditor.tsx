'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { CourseCatalogCard } from '@/components/courses/CourseCatalogCard'
import { courseRequiresPayment, formatCatalogPrice } from '@/components/courses/courseCatalogMeta'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { uploadMedia } from '@/features/courses/api/coursesApi'
import type { Course } from '@/features/courses/api/coursesApi'

type StorefrontCourse = Pick<
  Course,
  | 'slug'
  | 'title'
  | 'description'
  | 'thumbnail'
  | 'level'
  | 'lessonCount'
  | 'durationWeeks'
  | 'isPaid'
  | 'price'
  | 'currency'
  | 'requiresPayment'
>

export function CourseStorefrontEditor({
  course,
  courseId,
  lessonCount,
  onChange,
}: {
  course: StorefrontCourse
  courseId: string
  lessonCount: number
  onChange: (patch: Partial<StorefrontCourse>) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const thumbSrc = course.thumbnail ? resolveMediaUrl(course.thumbnail) : null
  const paid = courseRequiresPayment({
    isPaid: course.isPaid,
    price: course.price,
    requiresPayment: course.requiresPayment,
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const r = await uploadMedia(f, {
      purpose: 'course-thumbnail',
      entityId: courseId,
      slug: course.slug,
      variant: 'thumbnail',
    })
    setUploading(false)
    if (r.success && r.url) onChange({ thumbnail: r.url })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-300">Catalog — như học viên thấy</p>
        <p className="text-[10px] text-ds-subtle mt-1 leading-relaxed">
          Ảnh bìa, mô tả và giá hiển thị trên{' '}
          <span className="text-ds-muted">/courses</span> và trang khóa học. Lưu khóa để áp dụng.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="space-y-3">
          <label className="text-xs text-ds-muted block">
            Mô tả ngắn (catalog)
            <textarea
              value={course.description ?? ''}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={4}
              className="mt-1 studio-field"
              placeholder="2–3 câu giới thiệu khóa học cho trang danh sách và landing..."
            />
          </label>

          <div>
            <span className="text-xs text-ds-muted block mb-2">Ảnh bìa (thumbnail)</span>
            <div className="flex flex-wrap items-start gap-3">
              <div className="relative w-40 aspect-[16/10] rounded-lg border border-ds-border overflow-hidden bg-ds-elevated shrink-0">
                {thumbSrc ? (
                  <Image src={thumbSrc} alt="" fill className="object-cover" sizes="160px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-40">
                    🌌
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-[140px]">
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-ds-border text-gray-300 hover:bg-ds-accent-soft disabled:opacity-50"
                >
                  {uploading ? 'Đang tải…' : 'Tải ảnh lên'}
                </button>
                {course.thumbnail && (
                  <button
                    type="button"
                    onClick={() => onChange({ thumbnail: null })}
                    className="px-3 py-1.5 rounded-lg text-xs text-ds-warning hover:bg-white/5"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
            </div>
            <label className="text-xs text-ds-muted block mt-3">
              Hoặc dán URL ảnh
              <input
                value={course.thumbnail ?? ''}
                onChange={(e) => onChange({ thumbnail: e.target.value.trim() || null })}
                className="mt-1 studio-field text-[11px]"
                placeholder="https://..."
              />
            </label>
          </div>

          <p className="text-[10px] text-ds-subtle">
            Giá hiển thị:{' '}
            <span className="text-ds-accent font-medium">
              {formatCatalogPrice(course.price, course.currency, course.isPaid, course.requiresPayment)}
            </span>
            {paid ? ' (trả phí)' : ' (miễn phí)'} — chỉnh ở ô Paid / Price phía trên.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-ds-subtle">Xem trước thẻ</p>
          <CourseCatalogCard
            href={`/courses/${course.slug}`}
            course={{
              slug: course.slug,
              title: course.title || 'Tiêu đề khóa học',
              description: course.description,
              thumbnail: course.thumbnail,
              level: course.level,
              lessonCount,
              durationWeeks: course.durationWeeks,
              isPaid: course.isPaid,
              requiresPayment: course.requiresPayment,
              price: course.price,
              currency: course.currency,
            }}
          />
        </div>
      </div>
    </div>
  )
}
