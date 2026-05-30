#!/usr/bin/env node
/**
 * Guard: Zustand stores must not import other stores (orchestration belongs in hooks/UI).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const SCAN_ROOT = join(SCRIPT_DIR, '..', 'src', 'features')

const STORE_IMPORT_RE =
  /from\s+['"]@\/features\/[^'"]+\/stores\/[^'"]+['"]|from\s+['"]\.\.?\/[^'"]*stores\/[^'"]+['"]/g

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
    } else if (/stores\/[^/]+\.(ts|tsx)$/.test(full.replace(/\\/g, '/'))) {
      yield full
    }
  }
}

const violations = []
for (const abs of walk(SCAN_ROOT)) {
  const rel = relative(join(SCRIPT_DIR, '..'), abs).split(sep).join('/')
  const src = readFileSync(abs, 'utf8')
  let m
  STORE_IMPORT_RE.lastIndex = 0
  while ((m = STORE_IMPORT_RE.exec(src)) !== null) {
    const line = src.slice(0, m.index).split('\n').length
    violations.push({ file: rel, line, import: m[0] })
  }
}

if (violations.length) {
  console.error('features/**/stores must not import other stores:\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.import}`)
  }
  process.exit(1)
}

console.log('check-store-imports: OK')
