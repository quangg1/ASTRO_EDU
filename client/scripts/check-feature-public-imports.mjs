#!/usr/bin/env node
/**
 * Guard: feature A must not deep-import feature B internals.
 * Allowed cross-feature: `@/features/<other>/public` (and nested content3d public barrels).
 *
 * Debt frozen in architecture-baseline.json (rule: no-cross-feature-deep).
 *
 * Usage:
 *   node scripts/check-feature-public-imports.mjs
 *   node scripts/check-feature-public-imports.mjs --update-baseline
 *   node scripts/check-feature-public-imports.mjs --prune-baseline
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const CLIENT_ROOT = resolve(SCRIPT_DIR, '..')
const FEATURES_ROOT = join(CLIENT_ROOT, 'src', 'features')
const BASELINE_PATH = join(SCRIPT_DIR, 'architecture-baseline.json')

const toPosix = (p) => p.split(sep).join('/')

const DEEP_RE =
  /from\s+['"](@\/features\/([^/'"]+)(?:\/([^/'"]+))?\/(?:api|lib|hooks|stores|ui|cohort|admin|components)\/[^'"]+)['"]/g

function* walk(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (/\.(ts|tsx)$/.test(name)) yield full
  }
}

function featureKey(relPath) {
  // features/content3d/earth/hooks/x.ts → content3d/earth
  // features/courses/api/x.ts → courses
  const m = /^src\/features\/([^/]+)(?:\/([^/]+))?/.exec(relPath)
  if (!m) return null
  if (m[1] === 'content3d' && m[2] && !['api', 'lib', 'hooks', 'stores', 'ui', 'public.ts'].includes(m[2])) {
    return `${m[1]}/${m[2]}`
  }
  return m[1]
}

function targetFeature(importPath) {
  // @/features/courses/lib/foo → courses
  // @/features/content3d/earth/lib/foo → content3d/earth
  const m = /^@\/features\/([^/]+)(?:\/([^/]+))?/.exec(importPath)
  if (!m) return null
  const second = m[2]
  if (
    m[1] === 'content3d' &&
    second &&
    !['api', 'lib', 'hooks', 'stores', 'ui', 'public', 'server'].includes(second)
  ) {
    return `${m[1]}/${second}`
  }
  return m[1]
}

function sameDomain(a, b) {
  if (!a || !b) return true
  if (a === b) return true
  // content3d/* may talk to sibling content3d internals during migration
  if (a.startsWith('content3d') && b.startsWith('content3d')) return true
  return false
}

function collectViolations() {
  const violations = []
  for (const abs of walk(FEATURES_ROOT)) {
    const rel = toPosix(relative(CLIENT_ROOT, abs))
    const fromFeat = featureKey(rel)
    const src = readFileSync(abs, 'utf8')
    DEEP_RE.lastIndex = 0
    let m
    while ((m = DEEP_RE.exec(src)) !== null) {
      const importPath = m[1]
      const toFeat = targetFeature(importPath)
      if (sameDomain(fromFeat, toFeat)) continue
      // public/server are never matched by DEEP_RE
      const line = src.slice(0, m.index).split('\n').length
      violations.push({
        rule: 'no-cross-feature-deep',
        file: rel,
        line,
        import: importPath,
      })
    }
  }
  return violations
}

const keyOf = (v) => `${v.rule}|${v.file}|${v.import}`

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return { entries: [] }
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
}

function mergeWrite(rulePrefix, ruleEntries) {
  const prev = loadBaseline().entries || []
  const other = prev.filter((e) => !e.startsWith(rulePrefix))
  const next = [...other, ...ruleEntries].sort()
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        note: 'Frozen FE architecture debt. Remove via --prune-baseline only; never add by hand.',
        entries: [...new Set(next)],
      },
      null,
      2,
    )}\n`,
  )
  return next.length
}

const args = new Set(process.argv.slice(2))
const violations = collectViolations()
const RULE = 'no-cross-feature-deep|'

if (args.has('--update-baseline')) {
  const n = mergeWrite(RULE, violations.map(keyOf))
  console.log(`Feature-public baseline updated: ${violations.length} frozen (${n} total entries).`)
  process.exit(0)
}

if (args.has('--prune-baseline')) {
  const prev = loadBaseline().entries || []
  const live = new Set(violations.map(keyOf))
  const next = prev.filter((e) => !e.startsWith(RULE) || live.has(e))
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        note: 'Frozen FE architecture debt. Remove via --prune-baseline only; never add by hand.',
        entries: next.sort(),
      },
      null,
      2,
    )}\n`,
  )
  console.log(`Feature-public baseline pruned: ${prev.length - next.length} removed, ${next.length} left.`)
  process.exit(0)
}

const baseline = new Set(loadBaseline().entries || [])
const fresh = violations.filter((v) => !baseline.has(keyOf(v)))

if (fresh.length) {
  console.error(`Feature boundary violation: ${fresh.length} new deep cross-feature import(s).\n`)
  for (const v of fresh) {
    console.error(`  ${v.file}:${v.line}  ${v.import}`)
  }
  console.error('\nFix: import from @/features/<other>/public instead.')
  process.exit(1)
}

console.log(
  `check-feature-public-imports: OK (${baseline.size} frozen, ${violations.length} total, 0 new).`,
)
