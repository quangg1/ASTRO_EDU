#!/usr/bin/env node
// Phase 0 boundary guardrail.
//
// Rule: files under client/src/components/3d/ must NOT import @/lib/<x>Api
// or @/features/<x>/api/* directly (3D layer is presentational; data flows
// in via props or via a parent's domain hook).
//
// Existing debt is captured in ALLOWLIST so the script passes today; new
// violations fail CI. To remove an entry from the allowlist, refactor the
// file to receive data via props/hooks first.
//
// Usage:
//   node scripts/check-import-boundaries.mjs           # fail on violation
//   node scripts/check-import-boundaries.mjs --report  # list every match (advisory)

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(SCRIPT_DIR, '..')
const SCAN_ROOT = join(REPO_ROOT, 'src', 'components', '3d')

// Imports that the 3D presentational layer is forbidden to consume.
// Pattern matches: from '@/lib/<x>Api' OR from '@/features/<domain>/api/...'
const FORBIDDEN_RE =
  /from\s+['"]@\/(lib\/[A-Za-z0-9_-]*[Aa]pi|features\/[^'"\/]+\/api\/[^'"]+)['"]/g

// Optional debt allowlist (empty after Phase 4 — add entries only with a ticket + removal plan).
const ALLOWLIST = new Set([])

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      yield* walk(full)
    } else if (/\.(ts|tsx)$/.test(name)) {
      yield full
    }
  }
}

function toForwardSlash(p) {
  return p.split(sep).join('/')
}

const reportMode = process.argv.includes('--report')

const violations = []
const allowedHits = []

for (const abs of walk(SCAN_ROOT)) {
  const rel = toForwardSlash(relative(REPO_ROOT, abs))
  const src = readFileSync(abs, 'utf8')
  let m
  FORBIDDEN_RE.lastIndex = 0
  while ((m = FORBIDDEN_RE.exec(src)) !== null) {
    const importPath = m[1]
    const lineIndex = src.slice(0, m.index).split('\n').length
    const record = { file: rel, line: lineIndex, import: importPath }
    if (ALLOWLIST.has(rel)) {
      allowedHits.push(record)
    } else {
      violations.push(record)
    }
  }
}

if (reportMode) {
  console.log('Allowlisted (existing debt):')
  for (const h of allowedHits) {
    console.log(`  ${h.file}:${h.line}  ${h.import}`)
  }
  console.log(`\nNew violations: ${violations.length}`)
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}  ${v.import}`)
  }
  process.exit(0)
}

if (violations.length === 0) {
  console.log(
    `OK — components/3d boundary clean (${allowedHits.length} allowlisted, 0 new violations).`,
  )
  process.exit(0)
}

console.error('Boundary violation: components/3d must not import domain APIs directly.')
console.error('Forbidden imports:')
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.import}`)
}
console.error(
  '\nFix: receive the data via props from the page/orchestrator, or use a domain hook ' +
    'from features/<domain>/hooks. If this is genuine pre-existing debt, add the file to ' +
    'ALLOWLIST in scripts/check-import-boundaries.mjs with a phase note.',
)
process.exit(1)
