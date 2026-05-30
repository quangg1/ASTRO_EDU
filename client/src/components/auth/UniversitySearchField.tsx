'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { searchUniversities, type HipolabsUniversity } from '@/lib/hipolabsUniversities'

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(126,231,255,0.15)',
  borderRadius: 2,
  color: '#eaf6ff',
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  fontFamily: "'Space Grotesk', sans-serif",
  boxSizing: 'border-box',
}

export type UniversitySelection = {
  name: string
  country: string
  domain: string | null
}

export function UniversitySearchField({
  value,
  onChange,
  defaultCountry = 'Vietnam',
  label = 'Cơ quan / trường',
  placeholder = 'Gõ tên trường để tìm…',
}: {
  value: string
  onChange: (selection: UniversitySelection) => void
  defaultCountry?: string
  label?: string
  placeholder?: string
}) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(value)
  const [countryFilter, setCountryFilter] = useState(defaultCountry)
  const [results, setResults] = useState<HipolabsUniversity[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setQuery(value)
  }, [value])

  const updateMenuRect = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuRect({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  const runSearch = useCallback(async (term: string, country: string) => {
    const q = term.trim()
    if (q.length < 2) {
      setResults([])
      setSearchError('')
      return
    }
    setLoading(true)
    setSearchError('')
    const res = await searchUniversities({
      name: q,
      country: country || undefined,
      limit: 12,
    })
    setLoading(false)
    if (res.success && res.data) {
      setResults(res.data)
    } else {
      setResults([])
      setSearchError(res.error || 'Tra cứu thất bại')
    }
  }, [])

  useEffect(() => {
    if (!open) return
    updateMenuRect()
    const t = window.setTimeout(() => {
      void runSearch(query, countryFilter)
    }, 280)
    return () => window.clearTimeout(t)
  }, [query, countryFilter, open, runSearch, updateMenuRect])

  useEffect(() => {
    if (!open) return
    const onScroll = () => updateMenuRect()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, updateMenuRect])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t)) return
      const portal = document.getElementById(`uni-menu-${listId}`)
      if (portal?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [listId])

  const pick = (u: HipolabsUniversity) => {
    const name = u.name
    setQuery(name)
    onChange({
      name,
      country: u.country,
      domain: u.domains?.[0] ?? null,
    })
    setOpen(false)
  }

  const commitFreeText = () => {
    const name = query.trim()
    if (!name) return
    onChange({ name, country: countryFilter || '', domain: null })
    setOpen(false)
  }

  const showMenu = open && query.trim().length >= 2

  const menu =
    showMenu && menuRect && mounted ? (
      <ul
        id={`uni-menu-${listId}`}
        role="listbox"
        style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
        className="fixed z-[9999] max-h-52 overflow-y-auto rounded border border-cyan-500/25 bg-[#06091a] shadow-xl text-sm"
      >
        {loading ? (
          <li className="px-3 py-2 text-slate-500 text-xs">Đang tìm…</li>
        ) : searchError ? (
          <li className="px-3 py-2 text-red-300/90 text-xs">{searchError}</li>
        ) : results.length === 0 ? (
          <li className="px-3 py-2 text-slate-500 text-xs">
            Không có kết quả — Enter để giữ tên đã gõ
          </li>
        ) : (
          results.map((u) => (
            <li key={`${u.name}-${u.domains?.[0] ?? ''}`}>
              <button
                type="button"
                role="option"
                className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 text-slate-200 border-b border-white/5 last:border-0"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(u)}
              >
                <span className="block font-medium">{u.name}</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  {u.country}
                  {u['state-province'] ? ` · ${u['state-province']}` : ''}
                  {u.domains?.[0] ? ` · ${u.domains[0]}` : ''}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    ) : null

  return (
    <div ref={wrapRef}>
      <label className="block text-xs text-slate-400">
        {label}
        <span className="block text-[10px] text-slate-600 font-normal mt-0.5 normal-case tracking-normal">
          Hipolabs + danh sách bổ sung VN (Nông Lâm, Bách khoa, …)
        </span>
      </label>

      <div className="mt-1 flex flex-wrap gap-2 mb-2">
        <select
          value={countryFilter}
          onChange={(e) => {
            setCountryFilter(e.target.value)
            setOpen(true)
            updateMenuRect()
          }}
          className="text-xs rounded border border-white/10 bg-black/40 text-slate-300 px-2 py-1"
          aria-label="Lọc quốc gia"
        >
          <option value="Vietnam">Việt Nam</option>
          <option value="">Tất cả quốc gia</option>
          <option value="United States">United States</option>
          <option value="United Kingdom">United Kingdom</option>
        </select>
        <button
          type="button"
          className="text-[10px] text-slate-500 hover:text-slate-300 underline"
          onClick={() => {
            setCountryFilter('')
            setOpen(true)
            updateMenuRect()
          }}
        >
          Tìm toàn cầu
        </button>
      </div>

      <input
        ref={inputRef}
        className="w-full"
        style={fieldStyle}
        value={query}
        role="combobox"
        aria-expanded={showMenu}
        aria-controls={`uni-menu-${listId}`}
        aria-autocomplete="list"
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true)
          updateMenuRect()
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          updateMenuRect()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (results[0] && open) pick(results[0])
            else commitFreeText()
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!wrapRef.current?.contains(document.activeElement)) {
              const portal = document.getElementById(`uni-menu-${listId}`)
              if (portal?.contains(document.activeElement)) return
              commitFreeText()
            }
          }, 150)
        }}
      />

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
