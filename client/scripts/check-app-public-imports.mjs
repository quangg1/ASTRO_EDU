#!/usr/bin/env node
/**
 * Guard: `app/` imports feature code only via `public` / `server` barrels.
 * Deep `api|lib|hooks|stores|ui|cohort|admin|components` paths are forbidden.
 *
 * Existing debt is frozen in architecture-baseline.json (rule: no-app-deep-feature).
 *
 * Usage:
 *   node scripts/check-app-public-imports.mjs
 *   node scripts/check-app-public-imports.mjs --update-baseline
 *   node scripts/check-app-public-imports.mjs --prune-baseline
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const CLIENT_ROOT = resolve(SCRIPT_DIR, '..')
const SCAN_ROOT = join(CLIENT_ROOT, 'src', 'app')
const BASELINE_PATH = join(SCRIPT_DIR, 'architecture-baseline.json')

const toPosix = (p) => p.split(sep).join('/')

/** Ban deep feature internals; allow .../public and .../server */
const FORBIDDEN_RE =
  /from\s+['"](@\/features\/[^'"]+\/(?:api|lib|hooks|stores|ui|cohort|admin|components)\/[^'"]+)['"]/g

function* walk(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (/\.(ts|tsx)$/.test(name)) yield full
  }
}

function collectViolations() {
  const violations = []
  for (const abs of walk(SCAN_ROOT)) {
    const rel = toPosix(relative(CLIENT_ROOT, abs))
    const src = readFileSync(abs, 'utf8')
    FORBIDDEN_RE.lastIndex = 0
    let m
    while ((m = FORBIDDEN_RE.exec(src)) !== null) {
      const line = src.slice(0, m.index).split('\n').length
      violations.push({
        rule: 'no-app-deep-feature',
        file: rel,
        line,
        import: m[1],
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

function writeBaseline(entries) {
  const prev = loadBaseline()
  // Merge with other rules' entries when updating only app rule
  const other = (prev.entries || []).filter((e) => !e.startsWith('no-app-deep-feature|'))
  const next = [...other, ...entries].sort()
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
}

function pruneBaseline(liveKeys, rulePrefix) {
  const prev = loadBaseline().entries || []
  const live = new Set(liveKeys)
  const next = prev.filter((e) => {
    if (!e.startsWith(rulePrefix)) return true
    return live.has(e)
  })
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
  return { removed: prev.length - next.length, left: next.length }
}

const args = new Set(process.argv.slice(2))
const violations = collectViolations()

if (args.has('--update-baseline')) {
  writeBaseline(violations.map(keyOf))
  console.log(`App-public baseline updated: ${violations.length} deep imports frozen.`)
  process.exit(0)
}

if (args.has('--prune-baseline')) {
  const r = pruneBaseline(violations.map(keyOf), 'no-app-deep-feature|')
  console.log(`App-public baseline pruned: ${r.removed} removed, ${r.left} total entries left.`)
  process.exit(0)
}

const baseline = new Set(loadBaseline().entries || [])
const fresh = violations.filter((v) => !baseline.has(keyOf(v)))

if (fresh.length) {
  console.error(`app/ must import via features/<domain>/public|server, not deep paths:\n`)
  for (const v of fresh) {
    console.error(`  ${v.file}:${v.line}  ${v.import}`)
  }
  process.exit(1)
}

console.log(
  `check-app-public-imports: OK (${violations.length} frozen deep imports, 0 new).`,
)
