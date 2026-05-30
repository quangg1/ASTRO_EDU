'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { CourseCatalogCard } from '@/components/courses/CourseCatalogCard'
import { courseRequiresPayment, formatCatalogPrice } from '@/components/courses/courseCatalogMeta'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { uploadMedia } from '@/features/courses/api/coursesApi'
import type { Course } from '@/features/courses/api/coursesApi'
import { DistributionStrategySection } from '@/components/studio/DistributionStrategySection'
import {
  catalogPricingVisibleForStrategy,
  resolveDistributionStrategy,
} from '@/features/courses/lib/distributionStrategy'

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
  | 'cohortPrice'
  | 'cohortCurrency'
  | 'requiresPayment'
  | 'catalogEnabled'
  | 'distributionStrategy'
  | 'published'
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
  const strategy = resolveDistributionStrategy(course)
  const showCatalogPricing = catalogPricingVisibleForStrategy(strategy)
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
    <div className="rounded-2xl border border-ds-border bg-ds-overlay backdrop-blur p-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-300">Storefront & phân phối</p>
        <p className="text-[10px] text-ds-subtle mt-1 leading-relaxed">
          Cách học viên mua và vào khóa trên <span className="text-ds-muted">/courses</span>. Lưu khóa để áp dụng.
        </p>
      </div>

      <DistributionStrategySection
        value={strategy}
        onChange={(patch) => onChange(patch)}
      />

      {strategy === 'instructor_led' && (
        <p className="text-[11px] text-violet-200/90 rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-2 leading-relaxed">
          Khóa chỉ theo lớp — giá và thanh toán cấu hình khi tạo từng cohort (Studio → Lớp học theo kỳ). Catalog
          không hiển thị gói tự học.
        </p>
      )}

      <div
        className={`rounded-xl border p-3 ${
          course.published
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!course.published}
            onChange={(e) => onChange({ published: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            <span className="text-xs font-medium text-gray-200 block">
              {course.published ? 'Đã xuất bản' : 'Bản nháp (chưa công khai)'}
            </span>
            <span className="text-[10px] text-ds-subtle leading-relaxed block mt-1">
              {course.published
                ? strategy === 'instructor_led'
                  ? 'Landing khóa hiển thị — học viên chọn lớp để đăng ký.'
                  : 'Học viên thấy khóa trên /courses và có thể ghi danh (theo chế độ phân phối).'
                : 'Chỉ bạn và GV thấy khi soạn Studio.'}
            </span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="space-y-3">
          <label className="text-xs text-ds-muted block">
            Mô tả ngắn {strategy !== 'instructor_led' ? '(catalog & landing)' : '(landing khóa)'}
            <textarea
              value={course.description ?? ''}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={4}
              className="mt-1 studio-field"
              placeholder="2–3 câu giới thiệu khóa học..."
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

          {showCatalogPricing ? (
            <CatalogPricingFields course={course} paid={paid} onChange={onChange} />
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-ds-subtle">Xem trước thẻ catalog</p>
          {strategy === 'instructor_led' ? (
            <p className="text-[11px] text-ds-muted rounded-lg border border-dashed border-ds-border p-4 leading-relaxed">
              Khóa không xuất hiện trên danh sách tự học — học viên vào trang khóa để chọn lớp.
            </p>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}

function CatalogPricingFields({
  course,
  paid,
  onChange,
}: {
  course: StorefrontCourse
  paid: boolean
  onChange: (patch: Partial<StorefrontCourse>) => void
}) {
  return (
    <div className="rounded-xl border border-ds-border/80 bg-black/20 p-3 space-y-3">
      <p className="text-[10px] uppercase tracking-wide text-ds-subtle">Giá catalog (tự học)</p>
      <label className="flex items-center gap-2 text-xs text-ds-muted cursor-pointer">
        <input
          type="checkbox"
          checked={!!course.isPaid}
          onChange={(e) => onChange({ isPaid: e.target.checked })}
        />
        Khóa trả phí trên catalog
      </label>
      {course.isPaid && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ds-muted col-span-2 sm:col-span-1">
            Giá
            <input
              type="number"
              min={0}
              value={course.price ?? 0}
              onChange={(e) => onChange({ price: Math.max(0, Number(e.target.value) || 0) })}
              className="mt-1 studio-field w-full"
            />
          </label>
          <label className="text-xs text-ds-muted col-span-2 sm:col-span-1">
            Tiền tệ
            <select
              value={course.currency ?? 'VND'}
              onChange={(e) => onChange({ currency: e.target.value })}
              className="mt-1 studio-field w-full"
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
      )}
      <p className="text-[10px] text-ds-subtle">
        Hiển thị:{' '}
        <span className="text-ds-accent font-medium">
          {formatCatalogPrice(course.price, course.currency, course.isPaid, course.requiresPayment)}
        </span>
        {paid ? ' (trả phí)' : ' (miễn phí)'}
      </p>
    </div>
  )
}

function CohortPricingFields({
  course,
  onChange,
}: {
  course: StorefrontCourse
  onChange: (patch: Partial<StorefrontCourse>) => void
}) {
  const catalog = Math.max(0, Math.round(Number(course.price) || 0))
  const cohort = course.cohortPrice != null ? Math.round(Number(course.cohortPrice)) : null
  return (
    <div className="rounded-xl border border-purple-500/25 bg-purple-950/15 p-3 space-y-3">
      <p className="text-[10px] uppercase tracking-wide text-purple-200/80">Giá lớp (cohort / có GV)</p>
      <p className="text-[10px] text-ds-subtle leading-relaxed">
        Để trống = dùng giá catalog ({formatCatalogPrice(catalog, course.currency, course.isPaid)}). Khuyến nghị đặt{' '}
        <strong className="text-white/80">cao hơn</strong> tự học.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ds-muted col-span-2 sm:col-span-1">
          Học phí lớp
          <input
            type="number"
            min={0}
            value={cohort ?? ''}
            placeholder={catalog > 0 ? String(catalog) : '0'}
            onChange={(e) =>
              onChange({
                cohortPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="mt-1 studio-field w-full"
          />
        </label>
        <label className="text-xs text-ds-muted col-span-2 sm:col-span-1">
          Tiền tệ lớp
          <select
            value={course.cohortCurrency ?? course.currency ?? 'VND'}
            onChange={(e) => onChange({ cohortCurrency: e.target.value })}
            className="mt-1 studio-field w-full"
          >
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>
      {cohort != null && cohort > 0 && (
        <p className="text-[10px] text-purple-200/90">
          Hiển thị lớp: {formatCatalogPrice(cohort, course.cohortCurrency ?? course.currency, true)}
          {catalog > 0 && cohort > catalog ? (
            <span className="text-ds-muted"> · cao hơn tự học {formatCatalogPrice(catalog, course.currency, course.isPaid)}</span>
          ) : null}
        </p>
      )}
    </div>
  )
}
