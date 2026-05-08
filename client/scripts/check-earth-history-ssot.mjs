#!/usr/bin/env node
/**
 * Phase 3 — Earth static timeline SSOT guardrail.
 *
 * Canonical data: src/features/content3d/earth/lib/earthHistoryData.ts
 * Allowed imports of that module path:
 *   - src/features/content3d/narrative/presets/earth.ts (builds Narrative preset beats)
 *
 * Consumers should prefer `@/features/content3d/earth/public` for `earthHistoryData` / getStage*.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(SCRIPT_DIR, '..')
const SRC = join(REPO_ROOT, 'src')

const CANONICAL = 'features/content3d/earth/lib/earthHistoryData'
const ALLOW_DEEP_IMPORT = new Set(['src/features/content3d/narrative/presets/earth.ts'])

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
      if (name === 'node_modules' || name === '.next') continue
      yield* walk(full)
    } else if (/\.(tsx|ts)$/.test(name)) yield full
  }
}

const violations = []

for (const abs of walk(SRC)) {
  const norm = relative(REPO_ROOT, abs).replace(/\\/g, '/')
  const relPath = norm.startsWith('src/') ? norm : `src/${norm}`
  const txt = readFileSync(abs, 'utf8')

  const deepImportRe = new RegExp(`from\\s+['"]@/${CANONICAL}['"]`)
  if (!deepImportRe.test(txt)) continue
  if (ALLOW_DEEP_IMPORT.has(relPath)) continue

  const lineIdx = txt.split('\n').findIndex((l) => deepImportRe.test(l)) + 1
  violations.push({
    file: relPath,
    line: lineIdx || 1,
    msg: `Import earth timeline via @/features/content3d/earth/public (avoid deep pulls from ${CANONICAL})`,
  })
}

if (violations.length === 0) {
  console.log('OK — earthHistoryData SSOT: canonical lib + preset deep import only.')
  process.exit(0)
}

console.error('earthHistory SSOT violations:')
for (const v of violations) console.error(`  ${v.file}:${v.line}  ${v.msg}`)
process.exit(1)
