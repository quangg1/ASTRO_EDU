'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import * as d3 from 'd3-force'
import { useLearningPath } from '@/hooks/useLearningPath'
import { loadLessonCompletion } from '@/lib/learningPathProgress'
import { useAuthStore } from '@/store/useAuthStore'
import {
  buildDependentsMap,
  buildSeenConceptIds,
  buildStarMapGraph,
  collectEgoNodeIds,
  domainColorPair,
  filterGraphByNodeIds,
  searchConcepts,
  uniqDomains,
  type StarMapLink,
  type StarMapNode,
} from '@/lib/knowledgeGraphData'
import type { LearningConcept } from '@/data/learningPathCurriculum'
import { ArrowLeft, Orbit, ScanSearch, Sparkles } from 'lucide-react'

type GraphPayload = { nodes: StarMapNode[]; links: StarMapLink[] }
type ViewMode = 'focus' | 'full'
const DIFFICULTY_LABELS: Record<0 | 1 | 2, string> = {
  0: 'Beginner',
  1: 'Explorer',
  2: 'Researcher',
}

function linkEndpointIds(link: { source?: unknown; target?: unknown }): [string, string] {
  const s = link.source
  const t = link.target
  const sid = s && typeof s === 'object' && s !== null && 'id' in s ? String((s as { id: string }).id) : String(s ?? '')
  const tid = t && typeof t === 'object' && t !== null && 'id' in t ? String((t as { id: string }).id) : String(t ?? '')
  return [sid, tid]
}

export default function KnowledgeStarMap() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { modules, concepts, loaded } = useLearningPath()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const fgRef = useRef<ForceGraphMethods<StarMapNode, StarMapLink> | undefined>(undefined)
  const graphColRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 560 })
  /** Node đang xem trong panel (luôn có thể khác trung tâm ego khi toàn cục). */
  const [selectionId, setSelectionId] = useState<string | null>(null)
  /** Mặc định một domain để tránh “cục tóc” 323 node ngay từ đầu. */
  const [domain, setDomain] = useState<string>('astronomy')
  const [viewMode, setViewMode] = useState<ViewMode>('focus')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [egoHops, setEgoHops] = useState(2)
  const [search, setSearch] = useState('')
  const [hoverId, setHoverId] = useState<string | null>(null)
  /** Khi xem toàn cục: bật = chỉ vẽ cạnh kèm node đang hover (gọn). Tắt = vẽ mọi cạnh (rối nhưng đủ). */
  const [sparseFullLinks, setSparseFullLinks] = useState(false)
  const [progressTick, setProgressTick] = useState(0)
  const [zoomScale, setZoomScale] = useState(1)
  const [showAllDependents, setShowAllDependents] = useState(false)
  const studioMode = searchParams.get('ui') === 'studio'

  const buildQuery = useCallback(
    (p: { c: string | null | undefined; mode: ViewMode; domain: string; hops: number; sparse: boolean }) => {
      const sp = new URLSearchParams()
      if (p.c) sp.set('c', p.c)
      sp.set('mode', p.mode)
      sp.set('domain', p.domain)
      sp.set('hops', String(p.hops))
      if (p.sparse) sp.set('sparse', '1')
      if (studioMode) sp.set('ui', 'studio')
      return `${pathname}?${sp.toString()}`
    },
    [pathname, studioMode],
  )

  const mapQueryKey = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    if (!loaded || !concepts.length) return
    const validDomains = new Set(['all', ...uniqDomains(concepts)])
    const c = searchParams.get('c')?.trim() || ''
    const mode: ViewMode = studioMode ? (searchParams.get('mode') === 'full' ? 'full' : 'focus') : 'focus'
    let dom = studioMode ? searchParams.get('domain') || 'astronomy' : 'all'
    if (!validDomains.has(dom)) dom = 'astronomy'
    const hops = studioMode ? Math.min(3, Math.max(1, parseInt(searchParams.get('hops') || '2', 10) || 2)) : 2
    const sparse = studioMode ? searchParams.get('sparse') === '1' : false

    setViewMode(mode)
    setEgoHops(hops)
    setSparseFullLinks(sparse)

    if (c && concepts.some((x) => x.id === c)) {
      const cc = concepts.find((x) => x.id === c)!
      const cd = (cc.domain || 'misc').toLowerCase()
      const domFinal = dom !== 'all' && cd !== dom ? 'all' : dom
      setDomain(domFinal)
      setSelectionId(c)
      if (mode === 'focus') setFocusId(c)
    } else {
      setDomain(dom)
      setSelectionId(null)
    }
  }, [mapQueryKey, loaded, concepts, studioMode])

  useEffect(() => {
    const el = graphColRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setDims({ w: Math.max(320, Math.floor(r.width)), h: Math.max(400, Math.floor(r.height)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const bump = () => setProgressTick((t) => t + 1)
    window.addEventListener('storage', bump)
    window.addEventListener('lp-progress-changed', bump)
    return () => {
      window.removeEventListener('storage', bump)
      window.removeEventListener('lp-progress-changed', bump)
    }
  }, [])

  const filteredConcepts = useMemo(() => {
    if (domain === 'all') return concepts
    return concepts.filter((c) => (c.domain || 'misc').toLowerCase() === domain)
  }, [concepts, domain])

  const seen = useMemo(
    () => buildSeenConceptIds(modules, loadLessonCompletion(userId)),
    [modules, userId, progressTick],
  )

  const fullGraph: GraphPayload = useMemo(
    () => buildStarMapGraph(filteredConcepts, seen),
    [filteredConcepts, seen],
  )

  useEffect(() => {
    if (!loaded || !concepts.length) return
    if (searchParams.get('c')?.trim()) return
    setFocusId((prev) => {
      if (prev && filteredConcepts.some((c) => c.id === prev)) return prev
      const enc = filteredConcepts.find((c) => seen.has(c.id))
      return enc?.id ?? filteredConcepts[0]?.id ?? null
    })
  }, [filteredConcepts, seen, loaded, concepts.length, mapQueryKey])

  useEffect(() => {
    if (searchParams.get('c')?.trim()) return
    setSelectionId((sel) => {
      if (sel && filteredConcepts.some((c) => c.id === sel)) return sel
      if (focusId && filteredConcepts.some((c) => c.id === focusId)) return focusId
      return null
    })
  }, [filteredConcepts, focusId, mapQueryKey])

  const displayGraph: GraphPayload = useMemo(() => {
    if (viewMode === 'full') return fullGraph
    if (!focusId) return { nodes: [], links: [] }
    const ego = collectEgoNodeIds(filteredConcepts, focusId, egoHops)
    return filterGraphByNodeIds(fullGraph, ego)
  }, [fullGraph, filteredConcepts, viewMode, focusId, egoHops])

  const domains = useMemo(() => uniqDomains(concepts), [concepts])
  const domainAngles = useMemo(() => {
    const map = new Map<string, number>()
    if (domains.length === 0) return map
    domains.forEach((d, idx) => {
      map.set(d, (Math.PI * 2 * idx) / domains.length)
    })
    return map
  }, [domains])
  const searchHits = useMemo(() => searchConcepts(filteredConcepts, search, 12), [filteredConcepts, search])

  const focusConcept = useMemo(
    () => filteredConcepts.find((c) => c.id === focusId) ?? null,
    [filteredConcepts, focusId],
  )

  const conceptById = useMemo(() => new Map(concepts.map((c) => [c.id, c])), [concepts])

  const selectedConcept = useMemo(
    () => (selectionId ? conceptById.get(selectionId) ?? null : null),
    [conceptById, selectionId],
  )

  const prereqConcepts = useMemo((): LearningConcept[] => {
    if (!selectedConcept) return []
    const rows: LearningConcept[] = []
    for (const pid of selectedConcept.prerequisites ?? []) {
      const id = String(pid || '').trim()
      const c = conceptById.get(id)
      if (c) rows.push(c)
    }
    return rows.sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id, 'vi'))
  }, [selectedConcept, conceptById])

  const dependentConcepts = useMemo((): LearningConcept[] => {
    if (!selectionId) return []
    const dep = buildDependentsMap(concepts)
    const ids = dep.get(selectionId)
    if (!ids?.size) return []
    const rows = [...ids].map((id) => conceptById.get(id)).filter((c): c is LearningConcept => !!c)
    return rows.sort((a, b) => {
      const aReady = !(a.prerequisites ?? []).some((pid) => !seen.has(pid))
      const bReady = !(b.prerequisites ?? []).some((pid) => !seen.has(pid))
      if (aReady !== bReady) return aReady ? -1 : 1
      const aEncountered = seen.has(a.id)
      const bEncountered = seen.has(b.id)
      if (aEncountered !== bEncountered) return aEncountered ? 1 : -1
      return (a.title || a.id).localeCompare(b.title || b.id, 'vi')
    })
  }, [selectionId, concepts, conceptById])
  const visibleDependentConcepts = useMemo(
    () => (showAllDependents ? dependentConcepts : dependentConcepts.slice(0, 8)),
    [dependentConcepts, showAllDependents],
  )

  const frontierCount = useMemo(() => fullGraph.nodes.filter((n) => n.frontier).length, [fullGraph.nodes])
  const encounteredCount = useMemo(() => fullGraph.nodes.filter((n) => n.encountered).length, [fullGraph.nodes])

  const linkVisibility = useCallback(
    (link: StarMapLink | Record<string, unknown>) => {
      const [a, b] = linkEndpointIds(link)
      if (!studioMode) {
        const anchor = selectionId || focusId
        if (!anchor) return false
        if (hoverId) return a === hoverId || b === hoverId || a === anchor || b === anchor
        return a === anchor || b === anchor
      }
      if (viewMode === 'focus') return true
      if (!sparseFullLinks) return true
      const h = hoverId
      if (!h) return false
      return a === h || b === h
    },
    [studioMode, selectionId, focusId, hoverId, viewMode, sparseFullLinks],
  )

  const nodeColor = useCallback(
    (node: StarMapNode) => {
      if (node.frontier) return '#f59e0b'
      const { bright, dim } = domainColorPair(node.domain)
      if (node.id === selectionId) return bright
      if (node.id === focusId || node.id === hoverId) return bright
      return node.encountered ? bright : dim
    },
    [selectionId, focusId, hoverId],
  )

  const nodeVal = useCallback(
    (node: StarMapNode) => {
      const difficultyBoost = [0.3, 1.2, 2][node.difficultyLevel] ?? 1.2
      const base = node.val + difficultyBoost + Math.min(2.4, node.degree * 0.12)
      if (node.id === selectionId) return base + 10
      if (node.id === focusId) return base + 6
      if (node.id === hoverId) return base + 3
      return base
    },
    [selectionId, focusId, hoverId],
  )

  useEffect(() => {
    if (displayGraph.nodes.length === 0) return
    fgRef.current?.d3ReheatSimulation?.()
    const t = window.setTimeout(() => fgRef.current?.zoomToFit?.(420, 56), 80)
    return () => window.clearTimeout(t)
  }, [displayGraph, viewMode, focusId, egoHops, dims.w, dims.h])

  useEffect(() => {
    setShowAllDependents(false)
  }, [selectionId])

  useEffect(() => {
    if (!fgRef.current || displayGraph.nodes.length === 0) return
    const centerX = dims.w / 2
    const centerY = dims.h / 2
    const minSide = Math.max(320, Math.min(dims.w, dims.h))
    const sectorRadius = minSide * (viewMode === 'focus' ? 0.36 : 0.43)
    const ringRadius = [minSide * 0.16, minSide * 0.32, minSide * 0.5]
    fgRef.current.d3Force(
      'r',
      d3
        .forceRadial<StarMapNode>((n) => ringRadius[n.difficultyLevel] ?? ringRadius[1], centerX, centerY)
        .strength(viewMode === 'focus' ? 0.72 : 0.62),
    )
    fgRef.current.d3Force(
      'domain-x',
      d3
        .forceX<StarMapNode>((n) => {
          const theta = domainAngles.get(n.domain) ?? 0
          return centerX + Math.cos(theta) * sectorRadius
        })
        .strength(viewMode === 'focus' ? 0.24 : 0.2),
    )
    fgRef.current.d3Force(
      'domain-y',
      d3
        .forceY<StarMapNode>((n) => {
          const theta = domainAngles.get(n.domain) ?? 0
          return centerY + Math.sin(theta) * sectorRadius
        })
        .strength(viewMode === 'focus' ? 0.24 : 0.2),
    )
    fgRef.current.d3Force(
      'collide',
      d3
        .forceCollide<StarMapNode>((n) => Math.max(8, 5 + n.val * 1.7))
        .iterations(2)
        .strength(0.9),
    )
    fgRef.current.d3Force(
      'charge',
      d3.forceManyBody<StarMapNode>().strength(viewMode === 'focus' ? -90 : -120).distanceMax(minSide * 0.9),
    )
    fgRef.current.d3Force('center', d3.forceCenter(centerX, centerY))

    const linkForce = fgRef.current.d3Force('link') as d3.ForceLink<StarMapNode, StarMapLink> | undefined
    if (linkForce) {
      linkForce
        .distance((l) => {
          const src = l.source as StarMapNode
          const dst = l.target as StarMapNode
          const gap = Math.abs((dst?.difficultyLevel ?? 1) - (src?.difficultyLevel ?? 1))
          return (viewMode === 'focus' ? 42 : 50) + gap * 14
        })
        .strength(viewMode === 'focus' ? 0.2 : 0.16)
    }
    fgRef.current.d3ReheatSimulation?.()
  }, [displayGraph.nodes.length, dims.w, dims.h, domainAngles, viewMode])

  const jumpToConcept = useCallback(
    (c: LearningConcept) => {
      const dRaw = (c.domain || 'misc').toLowerCase()
      const nextDomain = domain !== 'all' && dRaw !== domain ? 'all' : domain
      router.push(
        buildQuery({
          c: c.id,
          mode: 'focus',
          domain: nextDomain,
          hops: egoHops,
          sparse: sparseFullLinks,
        }),
        { scroll: false },
      )
    },
    [domain, egoHops, sparseFullLinks, buildQuery, router],
  )

  const pickConcept = useCallback(
    (c: LearningConcept) => {
      setSearch('')
      jumpToConcept(c)
    },
    [jumpToConcept],
  )

  const pushGraphNode = useCallback(
    (id: string) => {
      const cc = conceptById.get(id)
      const dRaw = (cc?.domain || 'misc').toLowerCase()
      const nextDomain = domain !== 'all' && dRaw !== domain ? 'all' : domain
      router.push(
        buildQuery({
          c: id,
          mode: viewMode,
          domain: nextDomain,
          hops: egoHops,
          sparse: sparseFullLinks,
        }),
        { scroll: false },
      )
    },
    [conceptById, domain, viewMode, egoHops, sparseFullLinks, buildQuery, router],
  )

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.4]"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -15%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 30%, rgba(139,92,246,0.12), transparent), radial-gradient(ellipse 45% 35% at 0% 70%, rgba(34,211,238,0.08), transparent)',
        }}
      />

      <header className="relative z-10 border-b border-white/10 bg-[#070a10]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/tutorial"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-300 hover:bg-white/10"
              aria-label="Về Learning Path"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-300/90">
                <Sparkles className="h-3.5 w-3.5" />
                Knowledge star map
                <Orbit className="h-3.5 w-3.5 opacity-80" />
              </div>
              <h1
                className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl"
                style={{ fontFamily: 'var(--font-heading), Space Grotesk, sans-serif' }}
              >
                Bản đồ tri thức
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                Chọn một điểm kiến thức để xem <strong className="text-slate-300">cần học trước gì</strong> và{' '}
                <strong className="text-slate-300">mở khóa được gì</strong>.{' '}
                {studioMode
                  ? 'Bạn đang ở chế độ kỹ thuật để kiểm tra graph.'
                  : 'Các điểm màu vàng là phần bạn đã đủ điều kiện để học tiếp.'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-10 pt-4">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm lg:flex-row lg:flex-wrap lg:items-end">
          {studioMode ? (
            <div className="flex flex-wrap gap-2">
              <span className="w-full text-[10px] uppercase tracking-wide text-slate-500 lg:w-auto">Góc nhìn</span>
              <div className="flex rounded-lg border border-white/15 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const anchor = selectionId || focusId
                    router.push(
                      buildQuery({
                        c: anchor || null,
                        mode: 'focus',
                        domain,
                        hops: egoHops,
                        sparse: sparseFullLinks,
                      }),
                      { scroll: false },
                    )
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    viewMode === 'focus' ? 'bg-cyan-600/40 text-cyan-50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Xem quanh concept này
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const anchor = selectionId || focusId
                    router.push(
                      buildQuery({
                        c: anchor || null,
                        mode: 'full',
                        domain,
                        hops: egoHops,
                        sparse: sparseFullLinks,
                      }),
                      { scroll: false },
                    )
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    viewMode === 'full' ? 'bg-violet-600/40 text-violet-50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Xem tất cả
                </button>
              </div>
            </div>
          ) : null}

          {studioMode && viewMode === 'focus' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Mức mở rộng</span>
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() =>
                    router.replace(
                      buildQuery({
                        c: selectionId || focusId,
                        mode: 'focus',
                        domain,
                        hops: h,
                        sparse: sparseFullLinks,
                      }),
                      { scroll: false },
                    )
                  }
                  className={`rounded-md border px-2.5 py-1 text-xs ${
                    egoHops === h
                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                      : 'border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {h} lớp
                </button>
              ))}
            </div>
          ) : null}

          {studioMode ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Chủ đề</span>
              <select
                value={domain}
                onChange={(e) => {
                  const v = e.target.value
                  let keep: string | null = selectionId || focusId
                  if (keep && v !== 'all') {
                    const cc = conceptById.get(keep)
                    const cd = (cc?.domain || 'misc').toLowerCase()
                    if (cd !== v) keep = null
                  }
                  router.push(
                    buildQuery({
                      c: keep,
                      mode: viewMode,
                      domain: v,
                      hops: egoHops,
                      sparse: sparseFullLinks,
                    }),
                    { scroll: false },
                  )
                }}
                className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="all">Tất cả ({concepts.length})</option>
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-cyan-100/90">Chế độ học tập: tập trung quanh concept hiện tại.</p>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    buildQuery({
                      c: selectionId || focusId,
                      mode: viewMode === 'focus' ? 'full' : 'focus',
                      domain: 'all',
                      hops: 2,
                      sparse: false,
                    }),
                    { scroll: false },
                  )
                }
                className="rounded-md border border-white/20 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-white/10"
              >
                {viewMode === 'focus' ? 'Xem toàn bộ (nâng cao)' : 'Quay lại chế độ tập trung'}
              </button>
            </div>
          )}

          {studioMode && viewMode === 'full' ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={sparseFullLinks}
                onChange={(e) =>
                  router.replace(
                    buildQuery({
                      c: selectionId || focusId,
                      mode: viewMode,
                      domain,
                      hops: egoHops,
                      sparse: e.target.checked,
                    }),
                    { scroll: false },
                  )
                }
                className="rounded border-white/20 bg-black/40"
              />
              Chỉ hiện đường nối khi rê chuột (dễ nhìn hơn)
            </label>
          ) : studioMode ? (
            <p className="text-[11px] text-slate-500">
              Trung tâm:{' '}
              <span className="font-medium text-cyan-200/90">
                {focusConcept ? focusConcept.title || focusId : '—'}
              </span>
            </p>
          ) : null}

          <div className="relative min-w-[200px] flex-1 lg:max-w-sm">
            <ScanSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiến thức theo tên hoặc mã..."
              className="w-full rounded-lg border border-white/15 bg-black/50 py-2 pl-8 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-500/35"
            />
            {search.trim() && searchHits.length > 0 ? (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-auto rounded-lg border border-white/15 bg-[#0a1020] py-1 shadow-xl">
                {searchHits.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickConcept(c)}
                      className="flex w-full flex-col px-3 py-2 text-left text-xs hover:bg-white/10"
                    >
                      <span className="font-medium text-slate-100">{c.title || c.id}</span>
                      <span className="text-[10px] text-slate-500">
                        {c.id} · {c.domain || '—'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => fgRef.current?.zoomToFit?.(400, 48)}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
          >
            Đưa bản đồ vào khung nhìn
          </button>
        </div>

        <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>
            Bạn đã khám phá <strong className="text-slate-300">{encounteredCount}</strong>/
            <strong className="text-slate-300">{fullGraph.nodes.length}</strong> concept
          </span>
          <span>
            Gợi ý học tiếp ngay: <strong className="text-amber-300">{frontierCount}</strong> concept (màu vàng)
          </span>
          {viewMode === 'full' ? (
            <span>
              Đang xem tổng thể trong chủ đề hiện tại
            </span>
          ) : null}
          {!loaded ? <span>Đang tải…</span> : null}
          {viewMode === 'full' && sparseFullLinks ? (
            <span className="text-amber-200/80">Di chuột lên một node để xem cạnh nối nó.</span>
          ) : null}
        </div>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[1fr_minmax(260px,300px)]">
          <div
            ref={graphColRef}
            className="relative h-[min(72vh,720px)] min-h-[400px] w-full overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#030711] shadow-[0_0_60px_rgba(34,211,238,0.08)]"
          >
            {displayGraph.nodes.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500">
              <p>Không có dữ liệu để hiển thị.</p>
                {viewMode === 'focus' ? (
                  <p className="text-xs">Thử đổi nhóm kiến thức hoặc chọn điểm trung tâm khác.</p>
                ) : null}
              </div>
            ) : (
              <ForceGraph2D
                ref={fgRef}
                width={dims.w}
                height={dims.h}
                graphData={displayGraph}
                nodeId="id"
                nodeLabel="name"
                nodeVal={nodeVal}
                nodeColor={nodeColor}
                linkVisibility={linkVisibility}
                linkColor={(l) => {
                  const [a, b] = linkEndpointIds(l)
                  const anchor = selectionId || focusId
                  if (!studioMode) {
                    if (hoverId && (a === hoverId || b === hoverId)) return 'rgba(125,211,252,0.58)'
                    if (anchor && (a === anchor || b === anchor)) return 'rgba(148,163,184,0.44)'
                    return 'rgba(148,163,184,0.16)'
                  }
                  return 'rgba(148,163,184,0.36)'
                }}
                linkDirectionalParticles={0}
                linkDirectionalArrowLength={studioMode ? 3 : 2}
                linkDirectionalArrowRelPos={1}
                linkWidth={(l) => {
                  const src = l.source as StarMapNode
                  const dst = l.target as StarMapNode
                  if (src?.difficultyLevel === undefined || dst?.difficultyLevel === undefined) return 0.85
                  const base = dst.difficultyLevel >= src.difficultyLevel ? 0.9 : 0.62
                  return studioMode ? base : Math.max(0.5, base - 0.12)
                }}
                onRenderFramePre={(ctx) => {
                  const centerX = dims.w / 2
                  const centerY = dims.h / 2
                  const minSide = Math.max(320, Math.min(dims.w, dims.h))
                  const ringRadius = [minSide * 0.16, minSide * 0.32, minSide * 0.5]
                  ctx.save()
                  ctx.strokeStyle = 'rgba(148,163,184,0.18)'
                  ctx.lineWidth = 1
                  ringRadius.forEach((r, idx) => {
                    ctx.beginPath()
                    ctx.arc(centerX, centerY, r, 0, Math.PI * 2)
                    ctx.stroke()
                    if (zoomScale >= 1) {
                      ctx.fillStyle = idx === 0 ? 'rgba(16,185,129,0.75)' : idx === 1 ? 'rgba(56,189,248,0.75)' : 'rgba(167,139,250,0.75)'
                      ctx.font = '11px Inter, sans-serif'
                      ctx.fillText(DIFFICULTY_LABELS[idx as 0 | 1 | 2], centerX + 8, centerY - r + 14)
                    }
                  })
                  ctx.restore()
                }}
                onZoom={({ k }) => setZoomScale(k)}
                nodeCanvasObjectMode={() => 'after'}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const n = node as StarMapNode
                  const label = n.name
                  const x = Number((node as { x?: number }).x || 0)
                  const y = Number((node as { y?: number }).y || 0)
                  const isPinned = n.id === selectionId || n.id === focusId || n.id === hoverId || n.frontier
                  const zoomThreshold = 1.8
                  const hubThreshold = studioMode ? 5 : 8
                  if (zoomScale < zoomThreshold && n.degree <= hubThreshold && !isPinned) return
                  if (!studioMode && zoomScale < 2.4 && !isPinned && n.degree <= 10) return
                  const fontSize = zoomScale > 2.4 ? 12 / globalScale : 8 / globalScale
                  ctx.font = `${fontSize}px Inter, sans-serif`
                  ctx.fillStyle = n.frontier ? 'rgba(254,243,199,0.95)' : 'rgba(226,232,240,0.88)'
                  const maxChars = zoomScale > 2.6 ? 28 : 12
                  const txt = label.length > maxChars ? `${label.slice(0, maxChars)}...` : label
                  ctx.fillText(txt, x + 5 / globalScale, y - 5 / globalScale)
                }}
                backgroundColor="#030711"
                cooldownTicks={displayGraph.nodes.length > 140 ? 60 : 100}
                d3VelocityDecay={0.28}
                onNodeHover={(node) => setHoverId(node?.id ? String(node.id) : null)}
                onNodeClick={(node) => {
                  if (!node?.id) return
                  pushGraphNode(String(node.id))
                }}
              />
            )}
          </div>

          <aside className="flex max-h-[min(72vh,720px)] min-h-[280px] flex-col rounded-2xl border border-white/10 bg-[#060d18]/95 p-4 backdrop-blur-sm lg:min-h-[400px]">
            {!selectedConcept ? (
              <p className="text-sm text-slate-500">Chọn một điểm để xem kiến thức cần học trước và kiến thức mở rộng.</p>
            ) : (
              <>
                <div className="border-b border-white/10 pb-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Điểm kiến thức</p>
                  <h2 className="mt-1 text-base font-semibold leading-snug text-white">
                    {selectedConcept.title || selectedConcept.id}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{selectedConcept.id}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-slate-400">
                      {selectedConcept.domain || '—'}
                      {selectedConcept.subdomain ? ` / ${selectedConcept.subdomain}` : ''}
                    </span>
                    {seen.has(selectedConcept.id) ? (
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200/90">
                        Đã học qua
                      </span>
                    ) : (
                      <span className="rounded border border-white/10 px-2 py-0.5 text-slate-500">Chưa học</span>
                    )}
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
                      {selectedConcept.difficulty_level === 0
                        ? 'Beginner'
                        : selectedConcept.difficulty_level === 2
                          ? 'Researcher'
                          : 'Explorer'}
                    </span>
                  </div>
                  {selectedConcept.short_description ? (
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">{selectedConcept.short_description}</p>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-4">
                  <section>
                    <h3 className="text-[11px] font-medium uppercase tracking-wide text-cyan-200/90">
                      Học trước ({prereqConcepts.length})
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500">Những kiến thức nên học trước điểm hiện tại.</p>
                    {prereqConcepts.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Không có kiến thức tiền đề trực tiếp.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {prereqConcepts.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => jumpToConcept(c)}
                              className="w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-left text-xs text-slate-200 hover:border-cyan-500/35 hover:bg-cyan-950/30"
                            >
                              <span className="font-medium text-slate-100">{c.title || c.id}</span>
                              <span className="mt-0.5 block font-mono text-[10px] text-slate-500">{c.id}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="text-[11px] font-medium uppercase tracking-wide text-violet-200/90">
                      Làm nền cho ({dependentConcepts.length})
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500">Ưu tiên hiển thị concept bạn đã đủ điều kiện học trước.</p>
                    {dependentConcepts.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Chưa có kiến thức phụ thuộc trực tiếp.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {visibleDependentConcepts.map((c) => {
                          const ready = !(c.prerequisites ?? []).some((pid) => !seen.has(pid))
                          return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => jumpToConcept(c)}
                              className="w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-left text-xs text-slate-200 hover:border-violet-400/35 hover:bg-violet-950/25"
                            >
                              <span className="font-medium text-slate-100">
                                {c.title || c.id}{' '}
                                {ready ? (
                                  <span className="ml-1 rounded border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-200">
                                    Sẵn sàng học
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block font-mono text-[10px] text-slate-500">{c.id}</span>
                            </button>
                          </li>
                          )
                        })}
                      </ul>
                    )}
                    {dependentConcepts.length > 8 ? (
                      <button
                        type="button"
                        onClick={() => setShowAllDependents((v) => !v)}
                        className="mt-2 text-[11px] text-violet-200/85 hover:text-violet-100"
                      >
                        {showAllDependents ? 'Thu gọn danh sách' : `Xem thêm ${dependentConcepts.length - 8} concept`}
                      </button>
                    ) : null}
                  </section>

                  {viewMode === 'full' ? (
                    <button
                      type="button"
                      onClick={() => jumpToConcept(selectedConcept)}
                      className="w-full rounded-lg border border-cyan-500/40 bg-cyan-600/25 py-2.5 text-xs font-medium text-cyan-100 hover:bg-cyan-600/35"
                    >
                      Thu gọn quanh điểm này
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </aside>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-500">
          {domains.map((d) => {
            const { bright } = domainColorPair(d)
            return (
              <span key={d} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: bright }} />
                {d}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
