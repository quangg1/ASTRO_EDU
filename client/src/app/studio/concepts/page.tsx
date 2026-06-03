'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import type { LearningConcept, LearningModule, DepthLevel } from '@/data/learningPathCurriculum'
import { DEPTH_META, DEPTH_ORDER } from '@/data/learningPathCurriculum'
import {
  FALLBACK_TAXONOMY_REGISTRY,
  fetchEditorConcepts,
  fetchTaxonomyRegistryEditor,
  saveEditorConcepts,
  saveTaxonomyRegistryEditor,
  type TaxonomyRegistry,
} from '@/features/concepts/public'
import { fetchEditorLearningPath } from '@/features/learning-path/public'

// ─── UI constants ─────────────────────────────────────────────────────────────
const inputCls =
  'w-full bg-ds-surface border border-[var(--color-accent-soft)] px-3 py-2 text-ds-text text-sm focus:border-[var(--color-accent-strong)] focus:outline-none transition-colors placeholder:text-ds-subtle'

const chf = (cut = 14): React.CSSProperties => ({
  clipPath: `polygon(${cut}px 0,100% 0,100% calc(100% - ${cut}px),calc(100% - ${cut}px) 100%,0 100%,0 ${cut}px)`,
})

const panelStyle = (glowColor = 'rgba(126,231,255,0.18)'): React.CSSProperties => ({
  border: `1px solid ${glowColor}`,
  boxShadow: `0 0 24px -8px ${glowColor}`,
  ...chf(14),
})

function CornerBrackets({
  size = 14,
  color = 'rgba(126,231,255,0.55)',
}: {
  size?: number
  color?: string
}) {
  const b: React.CSSProperties = { position: 'absolute', width: size, height: size }
  return (
    <>
      <span style={{ ...b, top: 10, left: 10, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...b, top: 10, right: 10, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
      <span style={{ ...b, bottom: 10, left: 10, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...b, bottom: 10, right: 10, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
    </>
  )
}

// ─── Logic helpers (unchanged) ─────────────────────────────────────────────────
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

// ─── Page component ────────────────────────────────────────────────────────────
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
    return (
      <div
        className="min-h-screen pt-20 px-4 flex items-center justify-center"
        style={{ background: 'var(--color-bg-base)' }}
      >
        <p
          className="text-xs tracking-[0.2em] uppercase"
          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}
        >
          // verifying credentials...
        </p>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen pt-14 pb-16 px-3 md:px-6"
      style={{ background: 'linear-gradient(135deg,var(--color-bg-base) 0%,#050c1a 60%,var(--color-bg-base) 100%)' }}
    >
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      {/* Subtle grid overlay */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="max-w-6xl mx-auto space-y-5 relative" style={{ zIndex: 1 }}>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2">
          <Link
            href="/studio"
            className="text-xs transition-colors"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--color-accent)',
              letterSpacing: '0.1em',
            }}
          >
            ← Studio
          </Link>
          <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>/</span>
          <span
            className="text-xs"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--color-text-subtle)',
              letterSpacing: '0.1em',
            }}
          >
            concepts
          </span>
        </nav>

        {/* ── HEADER PANEL ──────────────────────────────────────────────────── */}
        <header
          className="relative px-5 py-5 md:px-7"
          style={{
            background: 'linear-gradient(135deg,rgba(0,24,48,0.85) 0%,rgba(4,8,20,0.9) 100%)',
            ...panelStyle('rgba(126,231,255,0.28)'),
          }}
        >
          <CornerBrackets size={16} />

          {/* Eyebrow */}
          <p
            className="mb-2 text-[10px] uppercase tracking-[0.22em]"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)' }}
          >
            // concept.studio · knowledge management
          </p>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1
                className="text-2xl md:text-3xl font-medium"
                style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}
              >
                Concept{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>Studio</em>
              </h1>
              <p
                className="mt-1 text-xs"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)', letterSpacing: '0.05em' }}
              >
                Tạo và quản lý thư viện concept dùng chung toàn hệ thống · lesson chỉ map bằng concept id
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Ghost button — Learning Path */}
              <Link
                href="/studio/learning-path"
                className="text-xs px-4 py-2 inline-flex items-center gap-2 transition-all"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--color-accent)',
                  border: '1px solid rgba(126,231,255,0.3)',
                  letterSpacing: '0.05em',
                  ...chf(8),
                  boxShadow: '0 0 12px -4px rgba(126,231,255,0)',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px -4px rgba(126,231,255,0.4)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,231,255,0.7)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px -4px rgba(126,231,255,0)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,231,255,0.3)'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Learning Path
              </Link>

              {/* Primary amber button — Save */}
              <button
                type="button"
                onClick={save}
                disabled={saving || loading}
                className="text-xs px-5 py-2 font-medium transition-all disabled:opacity-40"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  background: saving || loading ? '#6b4a10' : 'var(--color-brand-amber)',
                  color: '#1a0e00',
                  letterSpacing: '0.05em',
                  boxShadow: saving || loading ? 'none' : '0 0 20px -4px rgba(245,165,36,0.6)',
                  ...chf(8),
                }}
              >
                {saving ? '// saving...' : 'Lưu Concept Library'}
              </button>
            </div>
          </div>

          {/* Bottom-right label */}
          <span
            className="absolute bottom-3 right-7 text-[10px]"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(126,231,255,0.35)',
              letterSpacing: '0.12em',
            }}
          >
            {concepts.length} concepts loaded
          </span>
        </header>

        {/* ── MESSAGE ───────────────────────────────────────────────────────── */}
        {message ? (
          <div
            className="px-4 py-2 flex items-center gap-3"
            style={{
              background: 'rgba(109,255,176,0.06)',
              border: '1px solid rgba(109,255,176,0.3)',
              ...chf(8),
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6dffb0', flexShrink: 0, display: 'inline-block', boxShadow: '0 0 8px #6dffb0' }} />
            <p
              className="text-xs"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6dffb0', letterSpacing: '0.05em' }}
            >
              {message}
            </p>
          </div>
        ) : null}

        {/* ── TAXONOMY REGISTRY ─────────────────────────────────────────────── */}
        <section
          className="relative p-5 space-y-4"
          style={{
            background: 'rgba(6,11,24,0.8)',
            ...panelStyle('rgba(126,231,255,0.18)'),
          }}
        >
          {/* Section eyebrow */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.2em] mb-1"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)' }}
              >
                // 01 · taxonomy-registry
              </p>
              <h2
                className="text-sm font-medium"
                style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--color-text-primary)' }}
              >
                Domain &amp; Subdomain{' '}
                <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>Registry</em>
              </h2>
            </div>
            <p
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}
            >
              domain/subdomain chỉ tạo tại đây
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Domain panel */}
            <div
              className="p-3 space-y-2"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(126,231,255,0.1)',
                ...chf(10),
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
              >
                + Thêm domain
              </p>
              <div className="flex gap-2">
                <input
                  value={registryDomainName}
                  onChange={(e) => setRegistryDomainName(e.target.value)}
                  placeholder="vd: space-missions"
                  className={`${inputCls} flex-1`}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                />
                <button
                  type="button"
                  onClick={addRegistryDomain}
                  className="px-3 text-xs transition-all"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    border: '1px solid rgba(126,231,255,0.35)',
                    color: 'var(--color-accent)',
                    ...chf(6),
                  }}
                >
                  Thêm
                </button>
              </div>
              <div className="max-h-[130px] overflow-y-auto space-y-1 pr-1">
                {domainOptions.map((domain) => (
                  <div key={`registry-domain-${domain}`} className="flex items-center justify-between text-xs py-0.5">
                    <button
                      type="button"
                      onClick={() => setRegistryDomainTarget(domain)}
                      className="text-left transition-colors flex items-center gap-1.5"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: registryDomainTarget === domain ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      }}
                    >
                      {registryDomainTarget === domain && (
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
                      )}
                      {domain}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRegistryDomain(domain)}
                      className="text-[10px] transition-colors"
                      style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ff5cd4' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Subdomain panel */}
            <div
              className="p-3 space-y-2"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(126,231,255,0.1)',
                ...chf(10),
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
              >
                + Thêm subdomain
              </p>
              <select
                value={registryDomainTarget}
                onChange={(e) => setRegistryDomainTarget(e.target.value)}
                className={inputCls}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
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
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                />
                <button
                  type="button"
                  onClick={addRegistrySubdomain}
                  className="px-3 text-xs transition-all"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    border: '1px solid rgba(126,231,255,0.35)',
                    color: 'var(--color-accent)',
                    ...chf(6),
                  }}
                >
                  Thêm
                </button>
              </div>
              <div className="max-h-[130px] overflow-y-auto space-y-1 pr-1">
                {(taxonomyRegistry[registryDomainTarget] || []).map((subdomain) => (
                  <div
                    key={`registry-subdomain-${registryDomainTarget}-${subdomain}`}
                    className="flex items-center justify-between text-xs py-0.5"
                  >
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {subdomain}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRegistrySubdomain(registryDomainTarget, subdomain)}
                      className="text-[10px] transition-colors"
                      style={{ fontFamily: 'JetBrains Mono, monospace', color: '#ff5cd4' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── UNCLASSIFIED WARNING ───────────────────────────────────────────── */}
        {unclassifiedCount > 0 ? (
          <div
            className="px-4 py-2 flex items-center gap-3"
            style={{
              background: 'rgba(245,165,36,0.06)',
              border: '1px solid rgba(245,165,36,0.3)',
              ...chf(8),
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--color-brand-amber)',
                flexShrink: 0,
                display: 'inline-block',
                boxShadow: '0 0 8px var(--color-brand-amber)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <p
              className="text-xs"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-brand-amber)', letterSpacing: '0.05em' }}
            >
              {unclassifiedCount} concept chưa gán đủ taxonomy (domain/subdomain)
            </p>
          </div>
        ) : null}

        {/* ── UNCLASSIFIED QUEUE ────────────────────────────────────────────── */}
        {unclassifiedConcepts.length > 0 && (
          <section
            className="relative p-5 space-y-4"
            style={{
              background: 'rgba(24,12,0,0.7)',
              border: '1px solid rgba(245,165,36,0.3)',
              boxShadow: '0 0 24px -8px rgba(245,165,36,0.2)',
              ...chf(14),
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-1"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-brand-amber)' }}
                >
                  // 02 · unclassified-queue
                </p>
                <h2
                  className="text-sm font-medium flex items-center gap-2"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#ffd27a' }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-brand-amber)',
                      display: 'inline-block',
                      boxShadow: '0 0 8px var(--color-brand-amber)',
                    }}
                  />
                  Unclassified{' '}
                  <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>Queue</em>
                </h2>
              </div>
              <span
                className="text-xs px-3 py-1"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--color-brand-amber)',
                  border: '1px solid rgba(245,165,36,0.35)',
                  ...chf(6),
                  background: 'rgba(245,165,36,0.08)',
                }}
              >
                {unclassifiedConcepts.length} pending
              </span>
            </div>

            {activeQueueConcept && (
              <>
                <select
                  value={activeQueueConcept.id}
                  onChange={(e) => setQueueConceptId(e.target.value)}
                  className={inputCls}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {unclassifiedConcepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.title || c.id}
                    </option>
                  ))}
                </select>

                <div
                  className="p-3"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(245,165,36,0.15)',
                    ...chf(8),
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[10px] uppercase tracking-[0.15em]"
                      style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
                    >
                      Chọn concept áp dụng cùng lúc
                    </p>
                    <button
                      type="button"
                      onClick={() => setQueueSelectedIds(unclassifiedConcepts.map((c) => c.id))}
                      className="text-[10px] transition-colors"
                      style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)' }}
                    >
                      Chọn tất cả
                    </button>
                  </div>
                  <div className="max-h-[120px] overflow-y-auto space-y-1">
                    {unclassifiedConcepts.map((c) => {
                      const checked = queueSelectedIds.includes(c.id)
                      return (
                        <label key={`queue-select-${c.id}`} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setQueueSelectedIds((prev) =>
                                e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id),
                              )
                            }
                            style={{ accentColor: 'var(--color-brand-amber)' }}
                          />
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)', fontSize: 11 }}>
                            {c.id} — {c.title || c.id}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div
                  className="p-3"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(245,165,36,0.2)',
                    ...chf(10),
                  }}
                >
                  <p
                    className="text-[10px] mb-1"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)' }}
                  >
                    #{activeQueueConcept.id}
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--color-text-primary)' }}
                  >
                    {activeQueueConcept.title || activeQueueConcept.id}
                  </p>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: 'var(--color-text-subtle)', fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {activeQueueConcept.short_description || activeQueueConcept.explanation || 'Không có mô tả'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={queueDomain}
                    onChange={(e) => setQueueDomain(e.target.value)}
                    className={inputCls}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
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
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
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
                    className="text-xs font-medium px-4 py-2 transition-all"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      background: 'var(--color-brand-amber)',
                      color: '#1a0e00',
                      boxShadow: '0 0 16px -4px rgba(245,165,36,0.5)',
                      letterSpacing: '0.05em',
                      ...chf(8),
                    }}
                  >
                    Áp dụng cho concept đã chọn
                  </button>
                  <button
                    type="button"
                    onClick={applyQueueTaxonomyToSimilar}
                    className="text-xs font-medium px-4 py-2 transition-all"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#ffd27a',
                      border: '1px solid rgba(245,165,36,0.4)',
                      background: 'rgba(245,165,36,0.06)',
                      letterSpacing: '0.05em',
                      ...chf(8),
                    }}
                  >
                    Áp dụng cho concept tương tự
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── LOADING STATE ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="py-16 text-center">
            <p
              className="text-xs tracking-[0.2em] uppercase"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}
            >
              // loading concept library...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-4">

            {/* ── CREATE CONCEPT PANEL ──────────────────────────────────────── */}
            <section
              className="relative p-4 space-y-3"
              style={{
                background: 'rgba(6,11,24,0.85)',
                ...panelStyle('var(--color-accent-soft)'),
              }}
            >
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-1"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)' }}
                >
                  // 03 · new-concept
                </p>
                <h2
                  className="text-sm font-medium"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--color-text-primary)' }}
                >
                  Tạo concept{' '}
                  <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>mới</em>
                </h2>
              </div>

              <input
                value={newConceptId}
                onChange={(e) => setNewConceptId(slugifyConceptId(e.target.value))}
                placeholder="concept_id (vd: scientific_method)"
                className={inputCls}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
              <input
                value={newConceptTitle}
                onChange={(e) => setNewConceptTitle(e.target.value)}
                placeholder="title (vd: Quỹ đạo)"
                className={inputCls}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
              <input
                value={newConceptShortDescription}
                onChange={(e) => setNewConceptShortDescription(e.target.value)}
                placeholder="short_description"
                className={inputCls}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
              <textarea
                value={newConceptExplanation}
                onChange={(e) => setNewConceptExplanation(e.target.value)}
                placeholder="explanation"
                className={`${inputCls} min-h-[100px] resize-y`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
              <input
                value={newConceptExamples}
                onChange={(e) => setNewConceptExamples(e.target.value)}
                placeholder='examples (phân tách bởi "|")'
                className={inputCls}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
              <input
                value={newConceptRelated}
                onChange={(e) => setNewConceptRelated(e.target.value)}
                placeholder='related ids (vd: gravity|velocity)'
                className={inputCls}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
              <select
                value={newConceptDomain}
                onChange={(e) => setNewConceptDomain(e.target.value)}
                className={inputCls}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
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
                style={{ fontFamily: 'JetBrains Mono, monospace', opacity: newConceptDomain ? 1 : 0.5 }}
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
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />

              <label className="block">
                <span
                  className="text-[10px] uppercase tracking-[0.15em]"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
                >
                  Prerequisites mapping
                </span>
                <div
                  className="mt-1 max-h-[140px] overflow-y-auto p-2 space-y-1"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(126,231,255,0.1)',
                  }}
                >
                  {concepts
                    .filter((c) => c.id !== slugifyConceptId(newConceptId || newConceptTitle))
                    .map((c) => {
                      const checked = newConceptPrerequisites.includes(c.id)
                      return (
                        <label key={`new-pr-${c.id}`} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setNewConceptPrerequisites((prev) =>
                                e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id),
                              )
                            }
                            style={{ accentColor: 'var(--color-accent)' }}
                          />
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)', fontSize: 10 }}>
                            {c.id} — {c.title || c.id}
                          </span>
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
                className="w-full text-xs font-medium py-2 transition-all"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  background: 'rgba(109,255,176,0.12)',
                  color: '#6dffb0',
                  border: '1px solid rgba(109,255,176,0.35)',
                  letterSpacing: '0.08em',
                  boxShadow: '0 0 16px -6px rgba(109,255,176,0.3)',
                  ...chf(8),
                }}
              >
                + Tạo concept
              </button>
            </section>

            {/* ── CONCEPT LIST PANEL ────────────────────────────────────────── */}
            <section
              className="relative p-4"
              style={{
                background: 'rgba(5,9,16,0.85)',
                ...panelStyle('rgba(126,231,255,0.13)'),
              }}
            >
              <div className="mb-4 space-y-3">
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.2em] mb-1"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)' }}
                  >
                    // 04 · usage-report
                  </p>
                  <h2
                    className="text-sm font-medium"
                    style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--color-text-primary)' }}
                  >
                    Concept{' '}
                    <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--color-brand-amber)' }}>Usage Report</em>
                  </h2>
                </div>

                <input
                  value={conceptSearch}
                  onChange={(e) => setConceptSearch(e.target.value)}
                  className={inputCls}
                  placeholder="Tìm theo concept id/title/nội dung hoặc lesson/module..."
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={domainFilter}
                    onChange={(e) => {
                      setDomainFilter(e.target.value)
                      setSubdomainFilter('all')
                    }}
                    className={inputCls}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
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
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <option value="all">Tất cả subdomain</option>
                    {subdomainOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <p
                  className="text-[10px]"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)', letterSpacing: '0.1em' }}
                >
                  Hiển thị {filteredConcepts.length}/{concepts.length} concept
                </p>
              </div>

              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {filteredConcepts.length === 0 ? (
                  <p
                    className="text-xs py-8 text-center"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}
                  >
                    // no concepts found
                  </p>
                ) : (
                  filteredConcepts.map((c) => {
                    const rows = usageByConcept.get(c.id) || []
                    return (
                      <details
                        key={c.id}
                        className="group"
                        style={{
                          background: 'rgba(0,0,0,0.35)',
                          border: '1px solid rgba(126,231,255,0.1)',
                          ...chf(8),
                        }}
                      >
                        <summary
                          className="cursor-pointer flex items-center justify-between gap-2 px-3 py-2.5"
                          style={{ listStyle: 'none' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: c.domain ? 'var(--color-accent)' : 'var(--color-brand-amber)',
                                flexShrink: 0,
                                display: 'inline-block',
                              }}
                            />
                            <span
                              className="text-xs truncate"
                              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-accent)' }}
                            >
                              #{c.id}
                            </span>
                            <span
                              className="text-xs truncate hidden sm:inline"
                              style={{ color: 'var(--color-text-muted)', fontFamily: 'Space Grotesk, sans-serif' }}
                            >
                              · {c.title || c.id}
                            </span>
                          </div>
                          <span
                            className="text-[10px] shrink-0"
                            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}
                          >
                            {rows.length} lesson{rows.length !== 1 ? 's' : ''}
                          </span>
                        </summary>

                        <div className="px-3 pb-3 pt-1 space-y-2">
                          <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>{c.short_description}</p>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{c.explanation}</p>

                          {/* Full fields */}
                          <details
                            className="mt-1"
                            style={{
                              background: 'rgba(0,0,0,0.25)',
                              border: '1px solid rgba(126,231,255,0.08)',
                              ...chf(6),
                            }}
                          >
                            <summary
                              className="cursor-pointer px-3 py-1.5 text-[10px] uppercase tracking-[0.15em]"
                              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
                            >
                              Thông tin chính (full fields)
                            </summary>
                            <div className="px-3 pb-3 pt-2 space-y-2">
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}>Title</span>
                                <input
                                  value={c.title || ''}
                                  onChange={(e) =>
                                    setConcepts((prev) =>
                                      prev.map((x) => (x.id === c.id ? { ...x, title: e.target.value } : x)),
                                    )
                                  }
                                  className={`mt-1 ${inputCls}`}
                                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                                />
                              </label>
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}>Short description</span>
                                <input
                                  value={c.short_description || ''}
                                  onChange={(e) =>
                                    setConcepts((prev) =>
                                      prev.map((x) =>
                                        x.id === c.id ? { ...x, short_description: e.target.value } : x,
                                      ),
                                    )
                                  }
                                  className={`mt-1 ${inputCls}`}
                                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                                />
                              </label>
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}>Explanation</span>
                                <textarea
                                  value={c.explanation || ''}
                                  onChange={(e) =>
                                    setConcepts((prev) =>
                                      prev.map((x) => (x.id === c.id ? { ...x, explanation: e.target.value } : x)),
                                    )
                                  }
                                  className={`mt-1 ${inputCls} min-h-[90px] resize-y`}
                                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                                />
                              </label>
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}>Examples (phân tách bởi "|")</span>
                                <input
                                  value={(c.examples || []).join('|')}
                                  onChange={(e) =>
                                    setConcepts((prev) =>
                                      prev.map((x) =>
                                        x.id === c.id ? { ...x, examples: parsePipeList(e.target.value) } : x,
                                      ),
                                    )
                                  }
                                  className={`mt-1 ${inputCls}`}
                                  placeholder="ví dụ 1|ví dụ 2|ví dụ 3"
                                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                                />
                              </label>
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}>Related (ids, phân tách bởi "|")</span>
                                <input
                                  value={(c.related || []).join('|')}
                                  onChange={(e) =>
                                    setConcepts((prev) =>
                                      prev.map((x) =>
                                        x.id === c.id
                                          ? {
                                              ...x,
                                              related: parsePipeList(e.target.value).map((id) => slugifyConceptId(id)),
                                            }
                                          : x,
                                      ),
                                    )
                                  }
                                  className={`mt-1 ${inputCls}`}
                                  placeholder="gravity|velocity|orbital_period"
                                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                                />
                              </label>
                              <label className="inline-flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                                <input
                                  type="checkbox"
                                  checked={c.published !== false}
                                  onChange={(e) =>
                                    setConcepts((prev) =>
                                      prev.map((x) =>
                                        x.id === c.id ? { ...x, published: e.target.checked } : x,
                                      ),
                                    )
                                  }
                                  style={{ accentColor: 'var(--color-accent)' }}
                                />
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Published</span>
                              </label>
                            </div>
                          </details>

                          {/* Examples list */}
                          {c.examples?.length > 0 && (
                            <ul className="pl-3 space-y-0.5">
                              {c.examples.map((ex, i) => (
                                <li
                                  key={`${c.id}-ex-${i}`}
                                  className="text-[11px] flex items-start gap-1.5"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  <span style={{ color: 'var(--color-accent)', flexShrink: 0 }}>·</span>
                                  {ex}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Taxonomy */}
                          <details
                            style={{
                              background: 'rgba(0,0,0,0.25)',
                              border: '1px solid rgba(126,231,255,0.08)',
                              ...chf(6),
                            }}
                          >
                            <summary
                              className="cursor-pointer px-3 py-1.5 text-[10px] uppercase tracking-[0.15em]"
                              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
                            >
                              Taxonomy &amp; mapping
                            </summary>
                            <div className="px-3 pb-3 pt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}>Domain</span>
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
                                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                                >
                                  <option value="">Không gán</option>
                                  {domainOptions.map((d) => (
                                    <option key={d} value={d}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}>Subdomain</span>
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
                                  style={{ fontFamily: 'JetBrains Mono, monospace', opacity: c.domain ? 1 : 0.5 }}
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

                          {/* Advanced metadata */}
                          <details
                            style={{
                              background: 'rgba(0,0,0,0.25)',
                              border: '1px solid rgba(126,231,255,0.08)',
                              ...chf(6),
                            }}
                          >
                            <summary
                              className="cursor-pointer px-3 py-1.5 text-[10px] uppercase tracking-[0.15em]"
                              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
                            >
                              Metadata nâng cao
                            </summary>
                            <div className="px-3 pb-3 pt-2 space-y-2">
                              <details
                                style={{
                                  background: 'rgba(0,0,0,0.2)',
                                  border: '1px solid rgba(126,231,255,0.06)',
                                  ...chf(6),
                                }}
                              >
                                <summary
                                  className="cursor-pointer px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]"
                                  style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
                                >
                                  Aliases ({(c.aliases || []).length})
                                </summary>
                                <div className="px-3 pb-3 pt-2">
                                  <input
                                    value={(c.aliases || []).join('|')}
                                    onChange={(e) =>
                                      setConcepts((prev) =>
                                        prev.map((x) =>
                                          x.id === c.id ? { ...x, aliases: parsePipeList(e.target.value) } : x,
                                        ),
                                      )
                                    }
                                    className={inputCls}
                                    placeholder="alias1|alias2|alias3"
                                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                                  />
                                </div>
                              </details>

                              <details
                                style={{
                                  background: 'rgba(0,0,0,0.2)',
                                  border: '1px solid rgba(126,231,255,0.06)',
                                  ...chf(6),
                                }}
                              >
                                <summary
                                  className="cursor-pointer px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]"
                                  style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
                                >
                                  Prerequisites mapping ({(c.prerequisites || []).length})
                                </summary>
                                <div className="px-3 pb-3 pt-2">
                                  <div
                                    className="max-h-[140px] overflow-y-auto p-2 space-y-1"
                                    style={{
                                      background: 'rgba(0,0,0,0.3)',
                                      border: '1px solid rgba(126,231,255,0.08)',
                                    }}
                                  >
                                    {concepts
                                      .filter((cc) => cc.id !== c.id)
                                      .map((cc) => {
                                        const checked = (c.prerequisites || []).includes(cc.id)
                                        return (
                                          <label key={`${c.id}-pr-${cc.id}`} className="flex items-center gap-2 text-xs cursor-pointer">
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
                                              style={{ accentColor: 'var(--color-accent)' }}
                                            />
                                            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)', fontSize: 10 }}>
                                              {cc.id} — {cc.title || cc.id}
                                            </span>
                                          </label>
                                        )
                                      })}
                                  </div>
                                </div>
                              </details>
                            </div>
                          </details>

                          {/* Lesson usage */}
                          <details
                            style={{
                              background: 'rgba(0,0,0,0.25)',
                              border: '1px solid rgba(126,231,255,0.08)',
                              ...chf(6),
                            }}
                          >
                            <summary
                              className="cursor-pointer px-3 py-1.5 text-[10px] uppercase tracking-[0.15em]"
                              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-muted)' }}
                            >
                              Lesson usage ({rows.length})
                            </summary>
                            <div className="px-3 pb-3 pt-2 space-y-1">
                              {rows.length === 0 ? (
                                <p className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--color-text-subtle)' }}>
                                  // chưa được map vào lesson nào
                                </p>
                              ) : (
                                rows.map((r, idx) => (
                                  <p key={`${c.id}-${idx}`} className="text-[11px] leading-relaxed">
                                    <span style={{ color: 'var(--color-text-subtle)' }}>{r.moduleTitle}</span>
                                    <span style={{ color: 'var(--color-text-muted)' }}> → {r.nodeTitle} → </span>
                                    <span style={{ color: 'var(--color-accent)' }}>{DEPTH_META[r.depth].labelVi}</span>
                                    <span style={{ color: 'var(--color-text-muted)' }}> → {r.lessonTitle}</span>
                                  </p>
                                ))
                              )}
                            </div>
                          </details>

                          {/* Delete */}
                          <div className="flex justify-end pt-1">
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
                              className="text-[10px] uppercase tracking-[0.12em] transition-colors"
                              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,92,212,0.6)' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ff5cd4' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,92,212,0.6)' }}
                            >
                              × Xóa concept
                            </button>
                          </div>
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
