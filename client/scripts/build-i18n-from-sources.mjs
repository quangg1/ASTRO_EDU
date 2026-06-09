import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(f)
    const full = path.join(dir, p)
    if (fs.statSync(full).isDirectory()) {
      if (p === 'node_modules' || p === '.next') continue
      walk(full, acc)
    } else if (/\.(tsx?|jsx?)$/.test(p)) acc.push(full)
  }
  return acc
}

function setNested(tree, keyPath, value) {
  const parts = keyPath.split('.')
  let cur = tree
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (typeof cur[p] !== 'object' || cur[p] == null) cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = value
}

function extractKeys(content) {
  const keys = new Set()
  const re = /\bt\(\s*['"]([a-zA-Z][a-zA-Z0-9_.]*)['"]/g
  let m
  while ((m = re.exec(content))) keys.add(m[1])
  const re2 = /translate\(\s*[^,]+,\s*['"]([a-zA-Z][a-zA-Z0-9_.]*)['"]/g
  while ((m = re2.exec(content))) keys.add(m[1])
  return keys
}

function leafToVi(key) {
  const leaf = key.split('.').pop() || key
  return leaf
    .replace(/Html$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
}

const allKeys = new Set()
for (const file of walk(srcDir)) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue
  const content = fs.readFileSync(file, 'utf8')
  for (const k of extractKeys(content)) allKeys.add(k)
}

// Start from recovered base if present
const basePath = path.join(root, 'src/i18n/locales/vi-best.ts')
let baseTree = {}
if (fs.existsSync(basePath)) {
  const mod = await import(`file://${basePath.replace(/\\/g, '/')}`)
  const vi = mod.viMessages || {}
  baseTree = structuredClone(vi)
}

function getByPath(tree, keyPath) {
  const parts = keyPath.split('.')
  let cur = tree
  for (const p of parts) {
    if (typeof cur !== 'object' || cur == null || !(p in cur)) return undefined
    cur = cur[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

const tree = structuredClone(baseTree)
for (const key of [...allKeys].sort()) {
  if (!getByPath(tree, key)) setNested(tree, key, leafToVi(key))
}

function serialize(obj, indent = 2) {
  const pad = ' '.repeat(indent)
  const lines = ['export const viMessages = {']
  function ser(o, depth) {
    const p = ' '.repeat(depth)
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') {
        lines.push(`${p}${k}: ${JSON.stringify(v)},`)
      } else {
        lines.push(`${p}${k}: {`)
        ser(v, depth + 2)
        lines.push(`${p}},`)
      }
    }
  }
  ser(obj, indent)
  lines.push('} as const')
  lines.push('')
  return lines.join('\n')
}

const outDir = path.join(root, 'src/i18n/locales')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'vi.ts'), serialize(tree))
console.log('keys', allKeys.size, 'written vi.ts')
