'use client'

import { useId, useMemo } from 'react'
import type { LessonSceneContext } from '@/shared/types/sceneContext'
import { NASA_SHOWCASE_ITEMS } from '../../lib/showcaseEntities'
import { planetsData } from '../../lib/solarSystemData'
import { useShowcaseCatalogGen } from '../ShowcaseCatalogProvider'

type Props = {
  value: LessonSceneContext | null | undefined
  onChange: (next: LessonSceneContext | null) => void
  /** Dòng giải thích dưới tiêu đề; mặc định nói về Explore. */
  hint?: string
}

const splitIds = (raw: string) =>
  [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))]

/**
 * Ô khai báo "bài này mở cảnh 3D nào" — cùng dạng cho bài Lộ trình và bài Khóa học.
 * Đây là liên kết tường minh mạnh thứ hai của cầu nối Edu ↔ 3D (sau Studio entity).
 */
export function SceneContextField({ value, onChange, hint }: Props) {
  const listId = useId()
  const catalogGen = useShowcaseCatalogGen()
  const options = useMemo(() => {
    const rows = new Map<string, string>()
    for (const p of planetsData) rows.set(`planet-${p.name.toLowerCase()}`, p.nameVi || p.name)
    for (const item of NASA_SHOWCASE_ITEMS) rows.set(item.id, item.name)
    return [...rows.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    // NASA_SHOWCASE_ITEMS là mảng runtime được hydrate lại; catalogGen báo khi nó đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogGen])

  const primary = value?.primaryEntityId ?? ''
  const extra = (value?.entityIds ?? []).join(', ')

  const emit = (patch: Partial<LessonSceneContext>) => {
    const next: LessonSceneContext = { ...(value ?? {}), ...patch }
    const primaryId = String(next.primaryEntityId || '').trim()
    const entityIds = (next.entityIds ?? []).filter((id) => id && id !== primaryId)
    const cleaned: LessonSceneContext = {
      ...(primaryId ? { primaryEntityId: primaryId } : {}),
      ...(entityIds.length ? { entityIds } : {}),
      ...(primaryId && next.historyFocus ? { historyFocus: next.historyFocus } : {}),
    }
    onChange(Object.keys(cleaned).length ? cleaned : null)
  }

  const known = (id: string) => !id || options.some(([optionId]) => optionId === id)
  const unknownIds = [primary, ...(value?.entityIds ?? [])].filter((id) => id && !known(id))

  return (
    <div className="rounded-lg border border-ds-border bg-ds-base/40 p-3 space-y-2">
      <div>
        <div className="text-xs font-semibold text-ds-text">Cảnh 3D của bài</div>
        <p className="text-[11px] text-ds-muted">
          {hint ?? 'Người học mở bài này sẽ có nút “Xem trong 3D” tới entity chính trong Explore.'}
        </p>
      </div>
      <datalist id={listId}>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </datalist>
      <label className="block text-xs text-ds-muted">
        Entity chính
        <input
          className="studio-field mt-1"
          list={listId}
          placeholder="vd: planet-saturn"
          value={primary}
          onChange={(e) => emit({ primaryEntityId: e.target.value.trim() })}
        />
      </label>
      <label className="block text-xs text-ds-muted">
        Entity liên quan (phân cách bằng dấu phẩy)
        <input
          className="studio-field mt-1"
          list={listId}
          placeholder="vd: moon-titan, moon-enceladus"
          defaultValue={extra}
          key={extra}
          onBlur={(e) => emit({ entityIds: splitIds(e.target.value) })}
        />
      </label>
      {unknownIds.length > 0 && (
        <p className="text-[11px] text-amber-300">
          Không có trong cảnh 3D: {unknownIds.join(', ')}. Bài vẫn lưu, nhưng nút “Xem trong 3D” sẽ không mở được.
        </p>
      )}
    </div>
  )
}
