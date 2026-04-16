'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import type { LearningConcept, LearningModule, DepthLevel } from '@/data/learningPathCurriculum'
import { DEPTH_META, DEPTH_ORDER } from '@/data/learningPathCurriculum'
import {
  FALLBACK_TAXONOMY_REGISTRY,
  fetchEditorConcepts,
  fetchTaxonomyRegistryEditor,
  saveEditorConcepts,
  saveTaxonomyRegistryEditor,
  type TaxonomyRegistry,
} from '@/lib/conceptsApi'
import { fetchEditorLearningPath } from '@/lib/learningPathApi'

const inputCls =
  'w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-white text-sm focus:border-cyan-500/50 focus:outline-none transition-colors'

function slugifyConceptId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function safeLower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

type UsageRow = {
  conceptId: string
  moduleTitle: string
  nodeTitle: string
  depth: DepthLevel
  lessonTitle: string
}

function parsePipeList(raw: string): string[] {
  return raw
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
}

function getSubdomainOptionsForDomain(
  domain: string,
  taxonomyRegistry: TaxonomyRegistry,
): string[] {
  const set = new Set<string>(taxonomyRegistry[domain] || [])
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
}

function inferTaxonomySuggestion(concept: LearningConcept): {
  domain: string
  subdomain: string
} {
  const text = `${concept.id} ${concept.title} ${(concept.aliases || []).join(' ')}`.toLowerCase()
  if (/(orbit|aphelion|apastron|kepler|conjunction|transit)/.test(text)) {
    return { domain: 'astronomy', subdomain: 'orbital-mechanics' }
  }
  if (/(star|dwarf|supernova|fusion|magnitude|rayet)/.test(text)) {
    return { domain: 'astronomy', subdomain: 'stellar-physics' }
  }
  if (/(galaxy|cluster|cosmo|redshift|blueshift|universe)/.test(text)) {
    return { domain: 'astronomy', subdomain: 'galactic-cosmology' }
  }
  if (/(telescope|spectrum|wavelength|x_ray|ultraviolet|visible_light|light)/.test(text)) {
    return { domain: 'astronomy', subdomain: 'observational-astronomy' }
  }
  if (/(declination|right_ascension|zenith|equinox|sidereal|universal_time)/.test(text)) {
    return { domain: 'astronomy', subdomain: 'positional-astronomy' }
  }
  if (/(tectonic|volcano|subduction|tuff|tektite|vent)/.test(text)) {
    return { domain: 'geology', subdomain: 'tectonics' }
  }
  return { domain: 'astronomy', subdomain: 'fundamentals' }
}

function buildUsage(modules: LearningModule[]): UsageRow[] {
  const out: UsageRow[] = []
  for (const m of modules) {
    for (const n of m.nodes) {
      for (const d of DEPTH_ORDER) {
        for (const lesson of n.depths[d] ?? []) {
          for (const conceptId of lesson.conceptIds ?? []) {
            out.push({
              conceptId,
              moduleTitle: m.titleVi || m.title || m.id,
              nodeTitle: n.titleVi || n.title || n.id,
              depth: d,
              lessonTitle: lesson.titleVi || lesson.title || lesson.id,
            })
          }
        }
      }
    }
  }
  return out
}

export default function StudioConceptsPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [concepts, setConcepts] = useState<LearningConcept[]>([])
  const [taxonomyRegistry, setTaxonomyRegistry] = useState<TaxonomyRegistry>(FALLBACK_TAXONOMY_REGISTRY)
  const [modules, setModules] = useState<LearningModule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [conceptSearch, setConceptSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('all')
  const [subdomainFilter, setSubdomainFilter] = useState('all')

  const [newConceptId, setNewConceptId] = useState('')
  const [newConceptTitle, setNewConceptTitle] = useState('')
  const [newConceptShortDescription, setNewConceptShortDescription] = useState('')
  const [newConceptExplanation, setNewConceptExplanation] = useState('')
  const [newConceptExamples, setNewConceptExamples] = useState('')
  const [newConceptRelated, setNewConceptRelated] = useState('')
  const [newConceptDomain, setNewConceptDomain] = useState('')
  const [newConceptSubdomain, setNewConceptSubdomain] = useState('')
  const [newConceptAliases, setNewConceptAliases] = useState('')
  const [newConceptPrerequisites, setNewConceptPrerequisites] = useState<string[]>([])
  const [queueConceptId, setQueueConceptId] = useState<string | null>(null)
  const [queueSelectedIds, setQueueSelectedIds] = useState<string[]>([])
  const [queueDomain, setQueueDomain] = useState('')
  const [queueSubdomain, setQueueSubdomain] = useState('')
  const [registryDomainName, setRegistryDomainName] = useState('')
  const [registrySubdomainName, setRegistrySubdomainName] = useState('')
  const [registryDomainTarget, setRegistryDomainTarget] = useState('')

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/concepts')
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) {
      setLoading(false)
      return
    }
    Promise.all([fetchEditorConcepts(token), fetchEditorLearningPath(token), fetchTaxonomyRegistryEditor(token)])
      .then(([cs, lp, tx]) => {
        setConcepts(cs || [])
        setModules(lp?.modules || [])
        if (tx) setTaxonomyRegistry(tx)
      })
      .finally(() => setLoading(false))
  }, [user])

  const usageByConcept = useMemo(() => {
    const rows = buildUsage(modules)
    const map = new Map<string, UsageRow[]>()
    for (const row of rows) {
      if (!map.has(row.conceptId)) map.set(row.conceptId, [])
      map.get(row.conceptId)?.push(row)
    }
    return map
  }, [modules])

  const filteredConcepts = useMemo(() => {
    const q = safeLower(conceptSearch.trim())
    return concepts.filter((c) => {
      const passesDomain = domainFilter === 'all' || (c.domain || '') === domainFilter
      const passesSubdomain = subdomainFilter === 'all' || (c.subdomain || '') === subdomainFilter
      if (!passesDomain || !passesSubdomain) return false
      if (!q) return true
      const rows = usageByConcept.get(c.id) || []
      const usageText = rows
        .map((r) =>
          `${r.moduleTitle || ''} ${r.nodeTitle || ''} ${r.lessonTitle || ''} ${DEPTH_META[r.depth]?.labelVi || ''}`,
        )
        .join(' ')
      const usageLower = safeLower(usageText)
      return (
        safeLower(c.id).includes(q) ||
        safeLower(c.title).includes(q) ||
        safeLower(c.short_description).includes(q) ||
        safeLower(c.explanation).includes(q) ||
        (Array.isArray(c.examples) ? c.examples : []).some((x) => safeLower(x).includes(q)) ||
        (Array.isArray(c.aliases) ? c.aliases : []).some((x) => safeLower(x).includes(q)) ||
        usageLower.includes(q)
      )
    })
  }, [conceptSearch, concepts, usageByConcept, domainFilter, subdomainFilter])

  const domainOptions = useMemo(() => {
    return Object.keys(taxonomyRegistry).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [taxonomyRegistry])

  useEffect(() => {
    if (registryDomainTarget && domainOptions.includes(registryDomainTarget)) return
    setRegistryDomainTarget(domainOptions[0] || '')
  }, [domainOptions, registryDomainTarget])

  const subdomainOptions = useMemo(() => {
    const set = new Set<string>()
    if (domainFilter !== 'all') {
      ;(taxonomyRegistry[domainFilter] || []).forEach((x) => set.add(x))
    } else {
      Object.values(taxonomyRegistry).forEach((arr) => arr.forEach((x) => set.add(x)))
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [domainFilter, taxonomyRegistry])

  const newConceptSubdomainOptions = useMemo(
    () => (newConceptDomain ? getSubdomainOptionsForDomain(newConceptDomain, taxonomyRegistry) : []),
    [newConceptDomain, taxonomyRegistry],
  )
  const queueSubdomainOptions = useMemo(
    () => (queueDomain ? getSubdomainOptionsForDomain(queueDomain, taxonomyRegistry) : []),
    [queueDomain, taxonomyRegistry],
  )

  const unclassifiedCount = useMemo(
    () => concepts.filter((c) => !(c.domain && c.subdomain)).length,
    [concepts],
  )

  const unclassifiedConcepts = useMemo(
    () => concepts.filter((c) => !(c.domain && c.subdomain)),
    [concepts],
  )

  const activeQueueConcept = useMemo(
    () =>
      (queueConceptId ? unclassifiedConcepts.find((c) => c.id === queueConceptId) : null) ||
      unclassifiedConcepts[0] ||
      null,
    [queueConceptId, unclassifiedConcepts],
  )

  useEffect(() => {
    if (!activeQueueConcept) return
    const suggested = inferTaxonomySuggestion(activeQueueConcept)
    setQueueConceptId(activeQueueConcept.id)
    setQueueSelectedIds((prev) => (prev.length === 0 ? [activeQueueConcept.id] : prev))
    setQueueDomain(activeQueueConcept.domain || suggested.domain)
    setQueueSubdomain(activeQueueConcept.subdomain || suggested.subdomain)
  }, [activeQueueConcept?.id])

  useEffect(() => {
    if (!newConceptDomain) {
      setNewConceptSubdomain('')
      return
    }
    const opts = getSubdomainOptionsForDomain(newConceptDomain, taxonomyRegistry)
    if (newConceptSubdomain && !opts.includes(newConceptSubdomain)) setNewConceptSubdomain('')
  }, [newConceptDomain, taxonomyRegistry])

  useEffect(() => {
    if (!queueDomain) return
    const opts = getSubdomainOptionsForDomain(queueDomain, taxonomyRegistry)
    if (queueSubdomain && !opts.includes(queueSubdomain)) setQueueSubdomain(opts[0] || '')
  }, [queueDomain, taxonomyRegistry])

  const applyQueueTaxonomy = () => {
    if (!activeQueueConcept) return
    const targetIds = queueSelectedIds.length > 0 ? [...new Set(queueSelectedIds)] : [activeQueueConcept.id]
    const targetSet = new Set(targetIds)
    setConcepts((prev) =>
      prev.map((c) =>
        targetSet.has(c.id)
          ? {
              ...c,
              domain: queueDomain || c.domain,
              subdomain: queueSubdomain || c.subdomain,
            }
          : c,
      ),
    )
    const remaining = unclassifiedConcepts.filter((c) => !targetSet.has(c.id))
    setQueueSelectedIds([])
    setQueueConceptId(remaining[0]?.id ?? null)
    setMessage(`Đã gán taxonomy cho ${targetIds.length} concept.`)
  }

  const applyQueueTaxonomyToSimilar = () => {
    if (!activeQueueConcept) return
    const base = activeQueueConcept.id
    const prefix = base.split('_')[0]
    let affected = 0
    setConcepts((prev) =>
      prev.map((c) => {
        if (c.domain && c.subdomain) return c
        const matchByPrefix = c.id.startsWith(`${prefix}_`)
        const matchByGuess = inferTaxonomySuggestion(c).subdomain === queueSubdomain
        if (!matchByPrefix && !matchByGuess) return c
        affected += 1
        return {
          ...c,
          domain: queueDomain || c.domain,
          subdomain: queueSubdomain || c.subdomain,
        }
      }),
    )
    setMessage(`Đã áp dụng cho ${affected} concept tương tự.`)
  }

  const addRegistryDomain = () => {
    const normalized = slugifyConceptId(registryDomainName)
    if (!normalized) return
    setTaxonomyRegistry((prev) => {
      if (prev[normalized]) return prev
      return { ...prev, [normalized]: [] }
    })
    setRegistryDomainTarget(normalized)
    setRegistryDomainName('')
  }

  const removeRegistryDomain = (domain: string) => {
    setTaxonomyRegistry((prev) => {
      const next = { ...prev }
      delete next[domain]
      return next
    })
    setConcepts((prev) =>
      prev.map((c) => (c.domain === domain ? { ...c, domain: '', subdomain: '' } : c)),
    )
    if (registryDomainTarget === domain) setRegistryDomainTarget('')
  }

  const addRegistrySubdomain = () => {
    if (!registryDomainTarget) return
    const normalized = slugifyConceptId(registrySubdomainName)
    if (!normalized) return
    setTaxonomyRegistry((prev) => ({
      ...prev,
      [registryDomainTarget]: [...new Set([...(prev[registryDomainTarget] || []), normalized])],
    }))
    setRegistrySubdomainName('')
  }

  const removeRegistrySubdomain = (domain: string, subdomain: string) => {
    setTaxonomyRegistry((prev) => ({
      ...prev,
      [domain]: (prev[domain] || []).filter((x) => x !== subdomain),
    }))
    setConcepts((prev) =>
      prev.map((c) => (c.domain === domain && c.subdomain === subdomain ? { ...c, subdomain: '' } : c)),
    )
  }

  const save = async () => {
    const token = localStorage.getItem('galaxies_token')
    if (!token) return
    setSaving(true)
    setMessage('')
    const [conceptSave, taxonomySave] = await Promise.all([
      saveEditorConcepts(token, concepts),
      saveTaxonomyRegistryEditor(token, taxonomyRegistry),
    ])
    if (conceptSave.ok && taxonomySave.ok) {
      const fresh = await fetchEditorConcepts(token)
      if (fresh) setConcepts(fresh)
      if (taxonomySave.taxonomy) setTaxonomyRegistry(taxonomySave.taxonomy)
      setMessage('Đã lưu Concept Library vào server.')
    } else {
      setMessage(conceptSave.error || taxonomySave.error || 'Lỗi lưu concept')
    }
    setSaving(false)
  }

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra đăng nhập...</div>
  }

  return (
    <div className="min-h-screen bg-[#050508] pt-14 pb-10 px-3 md:px-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <nav className="text-sm">
          <Link href="/studio" className="text-cyan-400 hover:text-cyan-300">
            ← Studio
          </Link>
        </nav>

        <header className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-950/40 to-violet-950/30 px-4 py-4 md:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Concept Studio</h1>
            <p className="text-xs text-slate-400 mt-1">
              Tạo và quản lý thư viện concept dùng chung toàn hệ thống. Lesson chỉ map bằng concept id.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/studio/learning-path"
              className="text-xs min-h-10 px-3 inline-flex items-center rounded-lg border border-white/15 text-slate-200 hover:bg-white/10"
            >
              Đi tới Learning Path mapping
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="text-xs min-h-10 px-3 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu Concept Library'}
            </button>
          </div>
        </header>

        {message ? <p className="text-sm text-emerald-400/90">{message}</p> : null}
        <section className="rounded-2xl border border-white/10 bg-[#0b1220]/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-cyan-100">Taxonomy Registry</h2>
            <p className="text-[11px] text-slate-400">Domain/Subdomain chỉ tạo tại đây</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2">
              <p className="text-xs text-slate-300">Thêm domain</p>
              <div className="flex gap-2">
                <input
                  value={registryDomainName}
                  onChange={(e) => setRegistryDomainName(e.target.value)}
                  placeholder="vd: space-missions"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addRegistryDomain}
                  className="rounded-lg border border-cyan-500/40 px-3 text-xs text-cyan-200 hover:bg-cyan-500/10"
                >
                  Thêm
                </button>
              </div>
              <div className="max-h-[130px] overflow-y-auto space-y-1">
                {domainOptions.map((domain) => (
                  <div key={`registry-domain-${domain}`} className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setRegistryDomainTarget(domain)}
                      className={`text-left ${
                        registryDomainTarget === domain ? 'text-cyan-200' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {domain}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRegistryDomain(domain)}
                      className="text-rose-300 hover:text-rose-200"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2">
              <p className="text-xs text-slate-300">Thêm subdomain</p>
              <select
                value={registryDomainTarget}
                onChange={(e) => setRegistryDomainTarget(e.target.value)}
                className={inputCls}
              >
                {domainOptions.map((domain) => (
                  <option key={`registry-domain-opt-${domain}`} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={registrySubdomainName}
                  onChange={(e) => setRegistrySubdomainName(e.target.value)}
                  placeholder="vd: telescope-observation"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addRegistrySubdomain}
                  className="rounded-lg border border-cyan-500/40 px-3 text-xs text-cyan-200 hover:bg-cyan-500/10"
                >
                  Thêm
                </button>
              </div>
              <div className="max-h-[130px] overflow-y-auto space-y-1">
                {(taxonomyRegistry[registryDomainTarget] || []).map((subdomain) => (
                  <div
                    key={`registry-subdomain-${registryDomainTarget}-${subdomain}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-300">{subdomain}</span>
                    <button
                      type="button"
                      onClick={() => removeRegistrySubdomain(registryDomainTarget, subdomain)}
                      className="text-rose-300 hover:text-rose-200"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        {unclassifiedCount > 0 ? (
          <p className="text-xs text-amber-300/90">
            Có {unclassifiedCount} concept chưa gán đủ taxonomy (domain/subdomain).
          </p>
        ) : null}
        {unclassifiedConcepts.length > 0 && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-amber-200">Unclassified Queue</h2>
              <span className="text-[11px] text-amber-300/80">{unclassifiedConcepts.length} cần phân loại</span>
            </div>
            {activeQueueConcept && (
              <>
                <select
                  value={activeQueueConcept.id}
                  onChange={(e) => setQueueConceptId(e.target.value)}
                  className={inputCls}
                >
                  {unclassifiedConcepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.title || c.id}
                    </option>
                  ))}
                </select>
                <div className="rounded-lg border border-white/10 bg-black/25 p-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-slate-400">Chọn concept áp dụng cùng lúc</p>
                    <button
                      type="button"
                      onClick={() => setQueueSelectedIds(unclassifiedConcepts.map((c) => c.id))}
                      className="text-[10px] text-cyan-300 hover:text-cyan-100"
                    >
                      Chọn tất cả
                    </button>
                  </div>
                  <div className="max-h-[120px] overflow-y-auto space-y-1">
                    {unclassifiedConcepts.map((c) => {
                      const checked = queueSelectedIds.includes(c.id)
                      return (
                        <label key={`queue-select-${c.id}`} className="flex items-center gap-2 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setQueueSelectedIds((prev) =>
                                e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id),
                              )
                            }
                          />
                          <span>
                            {c.id} — {c.title || c.id}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-xs text-cyan-200">#{activeQueueConcept.id}</p>
                  <p className="text-sm text-white font-medium">{activeQueueConcept.title || activeQueueConcept.id}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {activeQueueConcept.short_description || activeQueueConcept.explanation || 'Không có mô tả'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select value={queueDomain} onChange={(e) => setQueueDomain(e.target.value)} className={inputCls}>
                    {domainOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    value={queueSubdomain}
                    onChange={(e) => setQueueSubdomain(e.target.value)}
                    className={inputCls}
                  >
                    {queueSubdomainOptions.length === 0 && <option value="">(không có subdomain)</option>}
                    {queueSubdomainOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyQueueTaxonomy}
                    className="rounded-lg bg-amber-600 text-white text-xs font-medium px-3 py-2 hover:bg-amber-500"
                  >
                    Áp dụng cho concept đã chọn
                  </button>
                  <button
                    type="button"
                    onClick={applyQueueTaxonomyToSimilar}
                    className="rounded-lg border border-amber-500/40 text-amber-200 text-xs font-medium px-3 py-2 hover:bg-amber-500/10"
                  >
                    Áp dụng cho concept tương tự
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {loading ? (
          <p className="text-slate-500 py-12 text-center">Đang tải...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-4">
            <section className="rounded-2xl border border-white/10 bg-[#0c1018] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Tạo concept mới</h2>
              <input
                value={newConceptId}
                onChange={(e) => setNewConceptId(slugifyConceptId(e.target.value))}
                placeholder="concept_id (vd: scientific_method)"
                className={inputCls}
              />
              <input
                value={newConceptTitle}
                onChange={(e) => setNewConceptTitle(e.target.value)}
                placeholder="title (vd: Quỹ đạo)"
                className={inputCls}
              />
              <input
                value={newConceptShortDescription}
                onChange={(e) => setNewConceptShortDescription(e.target.value)}
                placeholder="short_description"
                className={inputCls}
              />
              <textarea
                value={newConceptExplanation}
                onChange={(e) => setNewConceptExplanation(e.target.value)}
                placeholder="explanation"
                className={`${inputCls} min-h-[100px]`}
              />
              <input
                value={newConceptExamples}
                onChange={(e) => setNewConceptExamples(e.target.value)}
                placeholder='examples (phân tách bởi "|")'
                className={inputCls}
              />
              <input
                value={newConceptRelated}
                onChange={(e) => setNewConceptRelated(e.target.value)}
                placeholder='related ids (vd: gravity|velocity)'
                className={inputCls}
              />
              <select value={newConceptDomain} onChange={(e) => setNewConceptDomain(e.target.value)} className={inputCls}>
                <option value="">domain (chọn)</option>
                {domainOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={newConceptSubdomain}
                onChange={(e) => setNewConceptSubdomain(e.target.value)}
                className={inputCls}
                disabled={!newConceptDomain}
              >
                <option value="">subdomain (chọn)</option>
                {newConceptSubdomainOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                value={newConceptAliases}
                onChange={(e) => setNewConceptAliases(e.target.value)}
                placeholder='aliases (vd: quỹ đạo elip|elliptical orbit)'
                className={inputCls}
              />
              <label className="block text-xs text-slate-400">
                Prerequisites mapping
                <div className="mt-1 max-h-[140px] overflow-y-auto rounded-lg border border-white/15 bg-black/40 p-2 space-y-1">
                  {concepts
                    .filter((c) => c.id !== slugifyConceptId(newConceptId || newConceptTitle))
                    .map((c) => {
                      const checked = newConceptPrerequisites.includes(c.id)
                      return (
                        <label key={`new-pr-${c.id}`} className="flex items-center gap-2 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setNewConceptPrerequisites((prev) =>
                                e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id),
                              )
                            }
                          />
                          <span>{c.id} — {c.title || c.id}</span>
                        </label>
                      )
                    })}
                </div>
              </label>
              <button
                type="button"
                onClick={() => {
                  const id = slugifyConceptId(newConceptId || newConceptTitle)
                  if (!id || !newConceptExplanation.trim()) return
                  if (concepts.some((c) => c.id === id)) {
                    setMessage(`Concept "${id}" đã tồn tại`)
                    return
                  }
                  setConcepts((prev) => [
                    ...prev,
                    {
                      id,
                      title: newConceptTitle.trim() || id,
                      short_description: newConceptShortDescription.trim(),
                      explanation: newConceptExplanation.trim(),
                      examples: newConceptExamples
                        .split('|')
                        .map((x) => x.trim())
                        .filter(Boolean),
                      related: newConceptRelated
                        .split('|')
                        .map((x) => slugifyConceptId(x))
                        .filter(Boolean),
                      domain: newConceptDomain.trim() || undefined,
                      subdomain: newConceptSubdomain.trim() || undefined,
                      aliases: parsePipeList(newConceptAliases),
                      prerequisites: newConceptPrerequisites,
                    },
                  ])
                  setNewConceptId('')
                  setNewConceptTitle('')
                  setNewConceptShortDescription('')
                  setNewConceptExplanation('')
                  setNewConceptExamples('')
                  setNewConceptRelated('')
                  setNewConceptDomain('')
                  setNewConceptSubdomain('')
                  setNewConceptAliases('')
                  setNewConceptPrerequisites([])
                }}
                className="w-full rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium py-2"
              >
                + Tạo concept
              </button>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0a0f17] p-4">
              <div className="mb-3 space-y-2">
                <h2 className="text-sm font-semibold text-white">Concept usage report</h2>
                <input
                  value={conceptSearch}
                  onChange={(e) => setConceptSearch(e.target.value)}
                  className={inputCls}
                  placeholder="Tìm theo concept id/title/nội dung hoặc lesson/module..."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={domainFilter}
                    onChange={(e) => {
                      setDomainFilter(e.target.value)
                      setSubdomainFilter('all')
                    }}
                    className={inputCls}
                  >
                    <option value="all">Tất cả domain</option>
                    {domainOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    value={subdomainFilter}
                    onChange={(e) => setSubdomainFilter(e.target.value)}
                    className={inputCls}
                  >
                    <option value="all">Tất cả subdomain</option>
                    {subdomainOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  Hiển thị {filteredConcepts.length}/{concepts.length} concept
                </p>
              </div>
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {filteredConcepts.length === 0 ? (
                  <p className="text-xs text-slate-600">Chưa có concept nào.</p>
                ) : (
                  filteredConcepts.map((c) => {
                    const rows = usageByConcept.get(c.id) || []
                    return (
                      <details key={c.id} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                        <summary className="cursor-pointer flex items-center justify-between gap-2">
                          <span className="text-xs text-cyan-200">
                            #{c.id} · {c.title || c.id}
                          </span>
                          <span className="text-[11px] text-slate-400">{rows.length} lesson(s)</span>
                        </summary>
                        <div className="mt-2">
                          <p className="text-[11px] text-slate-400">{c.short_description}</p>
                          <p className="text-[11px] text-slate-300 mt-1">{c.explanation}</p>
                        </div>
                        {c.examples?.length > 0 && (
                          <ul className="mt-2 list-disc pl-4">
                            {c.examples.map((ex, i) => (
                              <li key={`${c.id}-ex-${i}`} className="text-[11px] text-slate-300">
                                {ex}
                              </li>
                            ))}
                          </ul>
                        )}
                        <details className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                          <summary className="cursor-pointer text-[11px] text-slate-300">Taxonomy & mapping</summary>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="text-[10px] text-slate-500">
                            Domain
                            <select
                              value={c.domain || ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setConcepts((prev) =>
                                  prev.map((x) =>
                                    x.id === c.id
                                      ? {
                                          ...x,
                                          domain: v || undefined,
                                          subdomain:
                                            v && x.domain !== v
                                              ? getSubdomainOptionsForDomain(v, taxonomyRegistry)[0] || undefined
                                              : x.subdomain,
                                        }
                                      : x,
                                  ),
                                )
                              }}
                              className={`mt-1 ${inputCls}`}
                            >
                              <option value="">Không gán</option>
                              {domainOptions.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[10px] text-slate-500">
                            Subdomain
                            <select
                              value={c.subdomain || ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setConcepts((prev) =>
                                  prev.map((x) => (x.id === c.id ? { ...x, subdomain: v || undefined } : x)),
                                )
                              }}
                              className={`mt-1 ${inputCls}`}
                              disabled={!c.domain}
                            >
                              <option value="">Không gán</option>
                              {getSubdomainOptionsForDomain(c.domain || '', taxonomyRegistry).map((d) => (
                                <option key={`${c.id}-${d}`} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </label>
                          </div>
                        </details>
                        <details className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                          <summary className="cursor-pointer text-[11px] text-slate-300">
                            Metadata nâng cao
                          </summary>
                        <details className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                          <summary className="cursor-pointer text-[11px] text-slate-300">
                            Aliases ({(c.aliases || []).length})
                          </summary>
                          <input
                            value={(c.aliases || []).join('|')}
                            onChange={(e) =>
                              setConcepts((prev) =>
                                prev.map((x) =>
                                  x.id === c.id ? { ...x, aliases: parsePipeList(e.target.value) } : x,
                                ),
                              )
                            }
                            className={`mt-2 ${inputCls}`}
                            placeholder="alias1|alias2|alias3"
                          />
                        </details>
                        <details className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                          <summary className="cursor-pointer text-[11px] text-slate-300">
                            Prerequisites mapping ({(c.prerequisites || []).length})
                          </summary>
                          <div className="mt-2 max-h-[140px] overflow-y-auto rounded-lg border border-white/15 bg-black/40 p-2 space-y-1">
                            {concepts
                              .filter((cc) => cc.id !== c.id)
                              .map((cc) => {
                                const checked = (c.prerequisites || []).includes(cc.id)
                                return (
                                  <label key={`${c.id}-pr-${cc.id}`} className="flex items-center gap-2 text-xs text-slate-200">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        setConcepts((prev) =>
                                          prev.map((x) => {
                                            if (x.id !== c.id) return x
                                            const current = x.prerequisites || []
                                            return {
                                              ...x,
                                              prerequisites: e.target.checked
                                                ? [...new Set([...current, cc.id])]
                                                : current.filter((id) => id !== cc.id),
                                            }
                                          }),
                                        )
                                      }
                                    />
                                    <span>{cc.id} — {cc.title || cc.id}</span>
                                  </label>
                                )
                              })}
                          </div>
                        </details>
                        </details>
                        <details className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
                          <summary className="cursor-pointer text-[11px] text-slate-300">
                            Lesson usage ({rows.length})
                          </summary>
                          <div className="mt-2 space-y-1">
                          {rows.length === 0 ? (
                            <p className="text-[11px] text-slate-500">Chưa được map vào lesson nào.</p>
                          ) : (
                            rows.map((r, idx) => (
                              <p key={`${c.id}-${idx}`} className="text-[11px] text-slate-300">
                                <span className="text-slate-500">{r.moduleTitle}</span> → {r.nodeTitle} →{' '}
                                <span className="text-cyan-300">{DEPTH_META[r.depth].labelVi}</span> → {r.lessonTitle}
                              </p>
                            ))
                          )}
                          </div>
                        </details>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const usedCount = rows.length
                              const ok =
                                usedCount > 0
                                  ? window.confirm(
                                      `Concept "${c.id}" đang được dùng trong ${usedCount} lesson(s). Bạn có chắc muốn xóa không?`,
                                    )
                                  : window.confirm(`Xóa concept "${c.id}"?`)
                              if (!ok) return
                              setConcepts((prev) => prev.filter((x) => x.id !== c.id))
                            }}
                            className="text-[11px] text-red-400/80 hover:text-red-300"
                          >
                            Xóa concept
                          </button>
                        </div>
                      </details>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
