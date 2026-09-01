#!/usr/bin/env node
/**
 * Generate ROUTE_INVENTORY.md — page → features → API paths → backend mounts.
 *
 * Usage:
 *   node scripts/gen-route-inventory.mjs           # write inventory
 *   node scripts/gen-route-inventory.mjs --check   # fail if stale vs committed file
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const CLIENT_ROOT = resolve(SCRIPT_DIR, '..')
const REPO_ROOT = resolve(CLIENT_ROOT, '..')
const APP_ROOT = join(CLIENT_ROOT, 'src', 'app')
const FEATURES_ROOT = join(CLIENT_ROOT, 'src', 'features')
const OUT_MD = join(CLIENT_ROOT, 'ROUTE_INVENTORY.md')
const OUT_JSON = join(CLIENT_ROOT, 'scripts', 'route-inventory.json')
const SERVER_JS = join(REPO_ROOT, 'services', 'api', 'server.js')

const toPosix = (p) => p.split(sep).join('/')

const IMPORT_RE =
  /from\s+['"](@\/[^'"]+|relative:[^'"]+\.[^'"]+)['"]|import\s*\(\s*['"](@\/[^'"]+)['"]\s*\)/g
const FROM_ONLY_RE = /from\s+['"](@\/[^'"]+)['"]/g
const API_PATH_RE = /[`'"](\/(?:api\/)?[a-z0-9][\w\-/{}$]*)[`'"]/gi

function* walk(dir, pred) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full, pred)
    else if (pred(name, full)) yield full
  }
}

function routeFromPage(absPage) {
  const rel = toPosix(relative(APP_ROOT, absPage))
  const dir = dirname(rel).replace(/\\/g, '/')
  if (dir === '.') return '/'
  return `/${dir}`.replace(/\/page\.tsx?$/, '') || '/'
}

function resolveAtImport(fromFile, spec) {
  if (!spec.startsWith('@/')) return null
  const without = spec.slice(2)
  const base = join(CLIENT_ROOT, 'src', without)
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand
  }
  return null
}

function featureOf(spec) {
  const m = /^@\/features\/([^/]+)/.exec(spec)
  if (!m) return null
  // nested content3d/*
  const nested = /^@\/features\/(content3d\/[^/]+)/.exec(spec)
  return nested ? nested[1] : m[1]
}

function collectImports(absFile) {
  if (!existsSync(absFile)) return []
  const src = readFileSync(absFile, 'utf8')
  const out = []
  FROM_ONLY_RE.lastIndex = 0
  let m
  while ((m = FROM_ONLY_RE.exec(src)) !== null) out.push(m[1])
  return out
}

function extractApiPaths(absFile) {
  if (!existsSync(absFile)) return []
  const src = readFileSync(absFile, 'utf8')
  const paths = new Set()
  // Common patterns: `${base}/learning-path`, '/api/courses', getApiPathBase()+`/x`
  const templateRe = /\$\{[^}]+\}(\/[a-zA-Z0-9_\-/{}.]+)/g
  let m
  while ((m = templateRe.exec(src)) !== null) {
    paths.add(m[1].replace(/\{[^}]+\}/g, ':param'))
  }
  const strRe = /['"`](\/(?:api\/)?[a-zA-Z][\w\-/{]*)['"`]/g
  while ((m = strRe.exec(src)) !== null) {
    let p = m[1]
    if (p.includes('${')) continue
    if (!p.startsWith('/api/') && /^\/(auth|upload|files)\b/.test(p) === false) {
      // relative to API base — normalize
      if (/^\/[a-z]/.test(p) && !p.startsWith('/api/')) p = `/api${p.startsWith('/') ? '' : '/'}${p.replace(/^\//, '')}`
      // Actually client uses getApiPathBase() + `/learning-path` so path is /learning-path under /api
      if (p.startsWith('/api/')) {
        /* keep */
      } else if (p.startsWith('/') && !p.startsWith('//')) {
        p = `/api${p}`
      }
    }
    if (p.length > 2 && p.length < 120) paths.add(p)
  }
  return [...paths]
}

function loadBackendMounts() {
  if (!existsSync(SERVER_JS)) return []
  const src = readFileSync(SERVER_JS, 'utf8')
  const mounts = []
  const re = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)/g
  let m
  while ((m = re.exec(src)) !== null) {
    mounts.push({ mount: m[1], routerVar: m[2] })
  }
  return mounts
}

function matchBackend(apiPath, mounts) {
  const normalized = apiPath.startsWith('/api/') ? apiPath : apiPath
  let best = null
  for (const { mount } of mounts) {
    if (normalized === mount || normalized.startsWith(mount + '/')) {
      if (!best || mount.length > best.mount.length) best = { mount }
    }
  }
  return best?.mount || null
}

function mapMountToFeature(mount) {
  const table = [
    [/\/auth$/, 'auth'],
    [/\/api\/courses/, 'courses'],
    [/\/api\/tutorials/, 'courses'],
    [/\/api\/learning-path/, 'learning-path'],
    [/\/api\/concepts/, 'concepts'],
    [/\/api\/showcase-entities/, 'content3d'],
    [/\/api\/showcase-catalog/, 'content3d'],
    [/\/api\/showcase-orbits/, 'content3d'],
    [/\/api\/explore\//, 'content3d'],
    [/\/api\/gems/, 'rewards'],
    [/\/api\/showcase$/, 'rewards'],
    [/\/api\/earth-history/, 'content3d'],
    [/\/api\/planet-narratives/, 'content3d'],
    [/\/api\/fossils/, 'content3d'],
    [/\/api\/phyla/, 'content3d'],
    [/\/api\/payments/, 'payment'],
    [/\/api\/promotions/, 'promotions'],
    [/\/api\/notifications/, 'notifications'],
    [/\/api\/users/, 'users'],
    [/\/api\/messages/, 'messages'],
    [/\/api\/forums|\/api\/posts|\/api\/comments|\/api\/news|\/api\/community/, 'community'],
    [/\/api\/admin/, 'admin'],
    [/\/api\/agent/, 'agent'],
    [/\/api\/learning-state/, 'learning-state'],
    [/\/api\/onboarding/, 'onboarding'],
    [/\/api\/astronomy-calendar/, 'astronomy-calendar'],
  ]
  for (const [re, feat] of table) {
    if (re.test(mount)) return feat
  }
  return null
}

function analyzePage(absPage) {
  const route = routeFromPage(absPage)
  const pageRel = toPosix(relative(CLIENT_ROOT, absPage))
  const directImports = collectImports(absPage)
  const features = new Set()
  const entryPoints = new Set()
  const apiFiles = new Set()
  const apiPaths = new Set()

  for (const spec of directImports) {
    const feat = featureOf(spec)
    if (feat) {
      features.add(feat)
      entryPoints.add(spec)
    }
    const resolved = resolveAtImport(absPage, spec)
    if (!resolved) continue

    // One hop: if public/server barrel, scan its re-exports' targets lightly
    if (/[\\/](public|server)\.ts$/.test(resolved) || /features[\\/][^/]+[\\/]public\.ts$/.test(resolved)) {
      const barrelImports = collectImports(resolved)
      for (const b of barrelImports) {
        const absB = resolveAtImport(resolved, b.startsWith('@/') ? b : `@/${toPosix(relative(join(CLIENT_ROOT, 'src'), resolve(dirname(resolved), b))).replace(/^\.\.\//, '')}`)
        // Relative imports inside barrel
      }
      // Parse relative requires from barrel
      const barrelSrc = readFileSync(resolved, 'utf8')
      const relRe = /from\s+['"](\.[^'"]+)['"]/g
      let rm
      while ((rm = relRe.exec(barrelSrc)) !== null) {
        const target = resolve(dirname(resolved), rm[1])
        for (const cand of [target, `${target}.ts`, `${target}.tsx`, join(target, 'index.ts')]) {
          if (existsSync(cand) && statSync(cand).isFile()) {
            if (/[\\/]api[\\/]/.test(cand)) {
              apiFiles.add(toPosix(relative(CLIENT_ROOT, cand)))
              for (const p of extractApiPaths(cand)) apiPaths.add(p)
            }
          }
        }
      }
    }

    if (/[\\/]api[\\/]/.test(resolved)) {
      apiFiles.add(toPosix(relative(CLIENT_ROOT, resolved)))
      for (const p of extractApiPaths(resolved)) apiPaths.add(p)
    }
  }

  // Also scan feature api folders for features referenced
  for (const feat of features) {
    const apiDir = join(FEATURES_ROOT, ...feat.split('/'), 'api')
    if (!existsSync(apiDir)) continue
    for (const f of walk(apiDir, (n) => n.endsWith('.ts'))) {
      for (const p of extractApiPaths(f)) apiPaths.add(p)
    }
  }

  const lineCount = readFileSync(absPage, 'utf8').split('\n').length
  const tracePath = join(dirname(absPage), 'TRACE.md')
  const hasTrace = existsSync(tracePath)

  return {
    route,
    page: pageRel,
    lineCount,
    hasTrace,
    features: [...features].sort(),
    entryPoints: [...entryPoints].sort(),
    apiFiles: [...apiFiles].sort(),
    apiPaths: [...apiPaths].sort(),
  }
}

const mounts = loadBackendMounts()
const pages = [...walk(APP_ROOT, (n) => n === 'page.tsx' || n === 'page.ts')].sort()
const rows = pages.map(analyzePage)

for (const row of rows) {
  row.backendMounts = [
    ...new Set(
      row.apiPaths
        .map((p) => matchBackend(p.startsWith('/api/') ? p : `/api${p.startsWith('/') ? p : `/${p}`}`, mounts))
        .filter(Boolean),
    ),
  ].sort()
  row.backendFeatures = [
    ...new Set(row.backendMounts.map(mapMountToFeature).filter(Boolean)),
  ].sort()
}

function renderMarkdown(rows) {
  const lines = [
    '<!-- GENERATED by scripts/gen-route-inventory.mjs — do not edit by hand -->',
    '# Route inventory',
    '',
    'Page → features → API paths → backend mounts. Regenerate: `node scripts/gen-route-inventory.mjs`.',
    '',
    `| Route | Page LOC | Features | Backend mounts | TRACE |`,
    `| --- | ---: | --- | --- | --- |`,
  ]
  for (const r of rows) {
    const feats = r.features.length ? r.features.join(', ') : '—'
    const mountsCol = r.backendMounts.length ? r.backendMounts.join(', ') : '—'
    const trace = r.hasTrace ? 'yes' : r.lineCount >= 400 ? 'MISSING' : '—'
    lines.push(`| \`${r.route}\` | ${r.lineCount} | ${feats} | ${mountsCol} | ${trace} |`)
  }
  lines.push('')
  lines.push('## Detail')
  lines.push('')
  for (const r of rows) {
    lines.push(`### \`${r.route}\``)
    lines.push('')
    lines.push(`- **page:** \`${r.page}\` (${r.lineCount} lines)`)
    lines.push(`- **features:** ${r.features.length ? r.features.map((f) => `\`${f}\``).join(', ') : '—'}`)
    lines.push(`- **entry:** ${r.entryPoints.length ? r.entryPoints.map((e) => `\`${e}\``).join(', ') : '—'}`)
    if (r.apiPaths.length) {
      lines.push(`- **api paths (sampled):** ${r.apiPaths.slice(0, 12).map((p) => `\`${p}\``).join(', ')}`)
    }
    if (r.backendMounts.length) {
      lines.push(
        `- **backend:** ${r.backendMounts
          .map((m) => `\`${m}\` (${mapMountToFeature(m) || '?'})`)
          .join(', ')}`,
      )
    }
    if (r.hasTrace) lines.push(`- **TRACE:** \`${dirname(r.page)}/TRACE.md\``.replace(/\\/g, '/'))
    else if (r.lineCount >= 400) lines.push('- **TRACE:** MISSING (required for pages ≥400 LOC)')
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

const md = renderMarkdown(rows)
const json = JSON.stringify({ generatedAt: new Date().toISOString(), routes: rows }, null, 2) + '\n'

if (process.argv.includes('--check')) {
  if (!existsSync(OUT_MD)) {
    console.error('ROUTE_INVENTORY.md missing — run: node scripts/gen-route-inventory.mjs')
    process.exit(1)
  }
  const current = readFileSync(OUT_MD, 'utf8')
  // Compare without the generatedAt-sensitive JSON; MD is deterministic from routes
  if (current !== md) {
    console.error('ROUTE_INVENTORY.md is stale. Run: node scripts/gen-route-inventory.mjs')
    process.exit(1)
  }
  console.log('gen-route-inventory: OK (up to date)')
  process.exit(0)
}

writeFileSync(OUT_MD, md)
writeFileSync(OUT_JSON, json)
console.log(`Wrote ${toPosix(relative(CLIENT_ROOT, OUT_MD))} (${rows.length} routes)`)
