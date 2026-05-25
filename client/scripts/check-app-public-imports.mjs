#!/usr/bin/env node
/**
 * Guard: `app/` routes import feature code via `features/<domain>/public` only.
 * Deep `./api/*` imports belong inside the feature folder or in `components/`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const SCAN_ROOT = join(SCRIPT_DIR, '..', 'src', 'app')

const FORBIDDEN_RE = /from\s+['"]@\/features\/[^'"]+\/api\/[^'"]+['"]/g

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      yield* walk(full)
    } else if (/\.(ts|tsx)$/.test(name)) {
      yield full
    }
  }
}

const violations = []
for (const abs of walk(SCAN_ROOT)) {
  const rel = relative(join(SCRIPT_DIR, '..'), abs).split(sep).join('/')
  const src = readFileSync(abs, 'utf8')
  let m
  FORBIDDEN_RE.lastIndex = 0
  while ((m = FORBIDDEN_RE.exec(src)) !== null) {
    const line = src.slice(0, m.index).split('\n').length
    violations.push({ file: rel, line, import: m[0] })
  }
}

if (violations.length) {
  console.error('app/ must import via features/<domain>/public, not deep api paths:\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.import}`)
  }
  process.exit(1)
}

console.log('check-app-public-imports: OK')
