'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  GraduationCap,
  Building2,
  Clock,
  ExternalLink,
  CheckCircle2,
  Circle,
  Mail,
  Phone,
  Linkedin,
  Globe,
  User,
} from 'lucide-react'
import type { TeacherApplicationWithUser } from '@/features/admin/public'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { Badge, Button, Card, Dialog, Select } from '@/design-system'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

const REJECT_NOTE_MIN = 10

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
}

const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CvStep({
  done,
  active,
  label,
}: {
  done: boolean
  active: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden />
      ) : (
        <Circle
          className={cn('w-4 h-4 shrink-0', active ? 'text-cyan-400' : 'text-gray-600')}
          aria-hidden
        />
      )}
      <span
        className={cn(
          'text-xs truncate',
          done ? 'text-emerald-300' : active ? 'text-cyan-200' : 'text-gray-500',
        )}
      >
        {label}
      </span>
    </div>
  )
}

function ApplicationListCard({
  app,
  selected,
  onSelect,
}: {
  app: TeacherApplicationWithUser
  selected: boolean
  onSelect: () => void
}) {
  const email = app.applicationEmail || app.user?.email || ''
  const avatar = app.avatarUrl ? resolveMediaUrl(app.avatarUrl) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-xl border p-3 transition-colors',
        selected
          ? 'border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30'
          : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5',
      )}
    >
      <div className="flex gap-3">
        <div className="w-11 h-11 rounded-lg border border-white/10 bg-black/40 overflow-hidden shrink-0 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-gray-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-white text-sm truncate">
              {app.fullName || app.user?.displayName || 'Ứng viên'}
            </p>
            <Badge tone={STATUS_TONE[app.status] ?? 'neutral'} className="shrink-0 text-[10px]">
              {STATUS_LABEL[app.status] ?? app.status}
            </Badge>
          </div>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">{email}</p>
          {app.expertise?.length ? (
            <p className="text-[11px] text-cyan-400/80 mt-1 truncate">{app.expertise.join(' · ')}</p>
          ) : null}
          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
            <Clock className="w-3 h-3" />
            {formatWhen(app.createdAt)}
            {app.cvUrl && !app.cvReviewedAt && app.status === 'pending' ? (
              <span className="text-amber-400/90">· CV chưa xác nhận</span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}

function ApplicationDetail({
  app,
  busy,
  onMarkCvReviewed,
  onApprove,
  onReject,
}: {
  app: TeacherApplicationWithUser
  busy: boolean
  onMarkCvReviewed: () => void
  onApprove: () => void
  onReject: (note: string) => void
}) {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  const email = app.applicationEmail || app.user?.email || '—'
  const avatar = app.avatarUrl ? resolveMediaUrl(app.avatarUrl) : null
  const cvHref = app.cvUrl ? resolveMediaUrl(app.cvUrl) : null
  const canApprove = app.status === 'pending' && Boolean(app.cvReviewedAt)
  const cvStepDone = Boolean(app.cvReviewedAt)
  const cvOpened = Boolean(cvHref)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-white/10">
        <div className="w-20 h-20 rounded-xl border border-white/10 overflow-hidden bg-black/40 shrink-0 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">
              {app.fullName || app.user?.displayName || 'Ứng viên'}
            </h3>
            <Badge tone={STATUS_TONE[app.status] ?? 'neutral'}>
              {STATUS_LABEL[app.status] ?? app.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            {email}
          </p>
          {app.headline ? (
            <p className="text-sm text-cyan-200/80 mt-1">{app.headline}</p>
          ) : null}
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            {app.phone || '—'}
          </p>
          {app.city ? <p className="text-xs text-gray-600 mt-0.5">{app.city}</p> : null}
          <p className="text-xs text-gray-600 mt-2">Gửi lúc {formatWhen(app.createdAt)}</p>
        </div>
      </div>

      {app.status === 'pending' ? (
        <Card elevation="flat" className="mt-4 p-3 bg-black/25">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Quy trình duyệt</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CvStep done={cvOpened} active={!cvOpened} label="1. Mở & đọc CV" />
            <CvStep done={cvStepDone} active={cvOpened && !cvStepDone} label="2. Xác nhận đã xem" />
            <CvStep done={false} active={canApprove} label="3. Duyệt hoặc từ chối" />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {cvHref ? (
              <a
                href={cvHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
              >
                <FileText className="w-4 h-4" />
                {app.cvFileName || 'Xem CV (PDF)'}
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            ) : (
              <p className="text-sm text-red-300/90">Chưa có file CV</p>
            )}
            {app.certificateUrl ? (
              <a
                href={resolveMediaUrl(app.certificateUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-amber-200/90 hover:text-amber-100"
              >
                <FileText className="w-4 h-4" />
                {app.certificateFileName || 'Giấy tờ xác nhận'}
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {app.organization ? (
          <Card elevation="flat" className="p-3 bg-black/20">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">
              <Building2 className="w-3 h-3" /> Đơn vị / trường
            </p>
            <p className="text-sm text-gray-200">{app.organization}</p>
            {app.organizationRole ? (
              <p className="text-xs text-gray-500 mt-1">{app.organizationRole}</p>
            ) : null}
          </Card>
        ) : null}
        {app.education ? (
          <Card elevation="flat" className="p-3 bg-black/20">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1 mb-1">
              <GraduationCap className="w-3 h-3" /> Học vấn
            </p>
            <p className="text-sm text-gray-200">{app.education}</p>
          </Card>
        ) : null}
        {app.yearsExperience != null ? (
          <Card elevation="flat" className="p-3 bg-black/20">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Kinh nghiệm</p>
            <p className="text-sm text-gray-200">{app.yearsExperience} năm</p>
          </Card>
        ) : null}
      </div>

      {app.teachingLevels?.length ? (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Cấp giảng dạy</p>
          <div className="flex flex-wrap gap-1.5">
            {app.teachingLevels.map((level) => (
              <span
                key={level}
                className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-gray-400"
              >
                {level}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {app.expertise?.length ? (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Lĩnh vực / môn</p>
          <div className="flex flex-wrap gap-1.5">
            {app.expertise.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {(app.website || app.linkedin) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {app.website ? (
            <a
              href={app.website.startsWith('http') ? app.website : `https://${app.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" /> Website
            </a>
          ) : null}
          {app.linkedin ? (
            <a
              href={app.linkedin.startsWith('http') ? app.linkedin : `https://${app.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              <Linkedin className="w-3.5 h-3.5" /> LinkedIn
            </a>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex-1 min-h-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Giới thiệu</p>
        <Card elevation="flat" className="p-4 bg-black/20 max-h-48 overflow-y-auto">
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{app.bio || '—'}</p>
        </Card>
      </div>

      {app.status === 'rejected' && app.reviewNote ? (
        <Card elevation="flat" className="mt-4 p-3 border-red-500/20 bg-red-500/5">
          <p className="text-[10px] uppercase tracking-wider text-red-400/90 mb-1">Ghi chú từ chối</p>
          <p className="text-sm text-red-200/90">{app.reviewNote}</p>
        </Card>
      ) : null}

      {app.status === 'pending' ? (
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
          {cvHref && !app.cvReviewedAt ? (
            <Button variant="primary" size="md" disabled={busy} onClick={onMarkCvReviewed}>
              Xác nhận đã xem CV
            </Button>
          ) : null}
          <Button variant="primary" size="md" disabled={busy || !canApprove} onClick={onApprove}>
            Duyệt giảng viên
          </Button>
          <Button variant="danger" size="md" disabled={busy} onClick={() => setRejectOpen(true)}>
            Từ chối
          </Button>
          {!app.cvReviewedAt && cvHref ? (
            <p className="w-full text-[11px] text-amber-400/90">
              Cần xác nhận đã xem CV trước khi duyệt.
            </p>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Từ chối đơn"
        description={`Bắt buộc ghi lý do (ít nhất ${REJECT_NOTE_MIN} ký tự). Nội dung sẽ gửi email cho ứng viên.`}
        size="md"
      >
        <textarea
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          rows={4}
          required
          placeholder="Ví dụ: CV chưa thể hiện kinh nghiệm giảng dạy phù hợp; cần bổ sung giấy tờ liên kết trường…"
          className="w-full rounded-lg border border-white/10 bg-black/40 text-sm text-gray-200 p-3 resize-y min-h-[100px]"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          {rejectNote.trim().length} / {REJECT_NOTE_MIN}+ ký tự
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setRejectOpen(false)}>
            Huỷ
          </Button>
          <Button
            variant="danger"
            disabled={busy || rejectNote.trim().length < REJECT_NOTE_MIN}
            onClick={() => {
              onReject(rejectNote.trim())
              setRejectOpen(false)
              setRejectNote('')
            }}
          >
            Xác nhận từ chối
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

export function AdminTeacherApplicationsPanel({
  apps,
  filter,
  onFilterChange,
  loading,
  reviewingAppId,
  onMarkCvReviewed,
  onReview,
}: {
  apps: TeacherApplicationWithUser[]
  filter: 'pending' | 'approved' | 'rejected' | 'all'
  onFilterChange: (f: typeof filter) => void
  loading: boolean
  reviewingAppId: string | null
  onMarkCvReviewed: (app: TeacherApplicationWithUser) => void
  onReview: (app: TeacherApplicationWithUser, action: 'approve' | 'reject', note?: string) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!apps.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !apps.some((a) => a.id === selectedId)) {
      setSelectedId(apps[0].id)
    }
  }, [apps, selectedId])

  const selected = useMemo(() => {
    if (!apps.length) return null
    if (selectedId) return apps.find((a) => a.id === selectedId) ?? apps[0]
    return apps[0]
  }, [apps, selectedId])

  const busy = reviewingAppId != null

  return (
    <section className="rounded-2xl border border-white/10 bg-ds-base overflow-hidden mb-8">
      <div className="px-4 py-4 border-b border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-white text-lg">Đơn xin quyền giảng viên</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Xem hồ sơ, xác nhận CV, rồi duyệt hoặc từ chối — email tự gửi cho ứng viên.
          </p>
        </div>
        <Select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as typeof filter)}
          className="text-xs w-full sm:w-auto min-w-[140px]"
        >
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Đã từ chối</option>
          <option value="all">Tất cả</option>
        </Select>
      </div>

      {!loading && apps.length > 0 ? (
        <div className="px-4 py-2 border-b border-white/5">
          <span className="text-[11px] text-gray-500">
            {apps.length} đơn · {filter === 'all' ? 'tất cả trạng thái' : STATUS_LABEL[filter]}
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="p-12 text-center text-gray-500">
          <Spinner />
        </div>
      ) : apps.length === 0 ? (
        <div className="p-8">
          <EmptyState title="Không có đơn" description="Thay đổi bộ lọc hoặc quay lại sau." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] min-h-[520px]">
          <div className="border-b lg:border-b-0 lg:border-r border-white/10 p-3 space-y-2 max-h-[70vh] lg:max-h-none overflow-y-auto">
            {apps.map((app) => (
              <ApplicationListCard
                key={app.id}
                app={app}
                selected={selected?.id === app.id}
                onSelect={() => setSelectedId(app.id)}
              />
            ))}
          </div>
          <div className="p-4 sm:p-6 min-h-[360px]">
            {selected ? (
              <ApplicationDetail
                app={selected}
                busy={busy && reviewingAppId === selected.id}
                onMarkCvReviewed={() => onMarkCvReviewed(selected)}
                onApprove={() => onReview(selected, 'approve')}
                onReject={(note) => onReview(selected, 'reject', note)}
              />
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
