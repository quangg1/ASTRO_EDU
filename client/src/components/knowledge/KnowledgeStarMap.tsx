'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
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

  const buildQuery = useCallback(
    (p: { c: string | null | undefined; mode: ViewMode; domain: string; hops: number; sparse: boolean }) => {
      const sp = new URLSearchParams()
      if (p.c) sp.set('c', p.c)
      sp.set('mode', p.mode)
      sp.set('domain', p.domain)
      sp.set('hops', String(p.hops))
      if (p.sparse) sp.set('sparse', '1')
      return `${pathname}?${sp.toString()}`
    },
    [pathname],
  )

  const mapQueryKey = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    if (!loaded || !concepts.length) return
    const validDomains = new Set(['all', ...uniqDomains(concepts)])
    const c = searchParams.get('c')?.trim() || ''
    const mode: ViewMode = searchParams.get('mode') === 'full' ? 'full' : 'focus'
    let dom = searchParams.get('domain') || 'astronomy'
    if (!validDomains.has(dom)) dom = 'astronomy'
    const hops = Math.min(3, Math.max(1, parseInt(searchParams.get('hops') || '2', 10) || 2))
    const sparse = searchParams.get('sparse') === '1'

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
  }, [mapQueryKey, loaded, concepts])

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
    return rows.sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id, 'vi'))
  }, [selectionId, concepts, conceptById])

  const linkVisibility = useCallback(
    (link: StarMapLink | Record<string, unknown>) => {
      if (viewMode === 'focus') return true
      if (!sparseFullLinks) return true
      const [a, b] = linkEndpointIds(link)
      const h = hoverId
      if (!h) return false
      return a === h || b === h
    },
    [viewMode, sparseFullLinks, hoverId],
  )

  const nodeColor = useCallback(
    (node: StarMapNode) => {
      const { bright, dim } = domainColorPair(node.domain)
      if (node.id === selectionId) return bright
      if (node.id === focusId || node.id === hoverId) return bright
      return node.encountered ? bright : dim
    },
    [selectionId, focusId, hoverId],
  )

  const nodeVal = useCallback(
    (node: StarMapNode) => {
      const base = node.val
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
                Chọn một điểm trên đồ — cột bên phải giải thích <strong className="text-slate-300">học trước / làm nền
                cho đâu</strong>. Vùng lan cận thu nhỏ đồ thị; toàn cục có lọc cạnh theo hover.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-10 pt-4">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-[10px] uppercase tracking-wide text-slate-500 lg:w-auto">Chế độ</span>
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
                Vùng lan cận
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
                Toàn cục
              </button>
            </div>
          </div>

          {viewMode === 'focus' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Bán kính</span>
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
                  {h} bước
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Domain</span>
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

          {viewMode === 'full' ? (
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
              Chỉ cạnh theo hover (gọn hơn)
            </label>
          ) : (
            <p className="text-[11px] text-slate-500">
              Trung tâm:{' '}
              <span className="font-medium text-cyan-200/90">
                {focusConcept ? focusConcept.title || focusId : '—'}
              </span>
            </p>
          )}

          <div className="relative min-w-[200px] flex-1 lg:max-w-sm">
            <ScanSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm concept (id, tiêu đề)…"
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
            Căn khung
          </button>
        </div>

        <div className="mb-2 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>
            Hiển thị: <strong className="text-slate-300">{displayGraph.nodes.length}</strong> node ·{' '}
            <strong className="text-slate-300">{displayGraph.links.length}</strong> cạnh
          </span>
          {viewMode === 'full' ? (
            <span>
              Toàn bộ domain này: <strong className="text-slate-300">{fullGraph.nodes.length}</strong> node
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
                <p>Không có dữ liệu hiển thị.</p>
                {viewMode === 'focus' ? (
                  <p className="text-xs">Thử đổi domain hoặc tìm concept khác làm trung tâm.</p>
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
                linkColor={() => 'rgba(148,163,184,0.42)'}
                linkDirectionalParticles={0}
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={1}
                linkWidth={() => 0.85}
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
              <p className="text-sm text-slate-500">Chọn một điểm trên đồ để xem quan hệ prerequisite.</p>
            ) : (
              <>
                <div className="border-b border-white/10 pb-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Concept</p>
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
                        Đã gặp trong bài
                      </span>
                    ) : (
                      <span className="rounded border border-white/10 px-2 py-0.5 text-slate-500">Chưa trong tiến độ</span>
                    )}
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
                    <p className="mt-1 text-[11px] text-slate-500">Mũi tên trên đồ trỏ từ đây → vào concept hiện tại.</p>
                    {prereqConcepts.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Không có prerequisite trong dữ liệu.</p>
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
                    <p className="mt-1 text-[11px] text-slate-500">Các concept liệt kê prerequisite này.</p>
                    {dependentConcepts.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Không có concept phụ thuộc trực tiếp.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {dependentConcepts.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => jumpToConcept(c)}
                              className="w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-left text-xs text-slate-200 hover:border-violet-400/35 hover:bg-violet-950/25"
                            >
                              <span className="font-medium text-slate-100">{c.title || c.id}</span>
                              <span className="mt-0.5 block font-mono text-[10px] text-slate-500">{c.id}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {viewMode === 'full' ? (
                    <button
                      type="button"
                      onClick={() => jumpToConcept(selectedConcept)}
                      className="w-full rounded-lg border border-cyan-500/40 bg-cyan-600/25 py-2.5 text-xs font-medium text-cyan-100 hover:bg-cyan-600/35"
                    >
                      Thu vùng quanh concept này
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
