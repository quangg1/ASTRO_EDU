#!/usr/bin/env node
/**
 * Tối ưu GLB tải từ mạng trước khi đưa lên CDN.
 *
 *   npm run optimize:glb -- <file.glb | thư-mục> [--out assets-optimized] [--max-texture 2048]
 *                            [--simplify 0.5] [--source <url>] [--license "CC BY 4.0"]
 *
 * Các bước: gộp dữ liệu trùng → bỏ phần thừa → hàn đỉnh → (tuỳ chọn) giảm số tam giác
 * → thu nhỏ texture & chuyển WebP → nén lưới Meshopt. drei/useGLTF đọc được Meshopt sẵn.
 * Mỗi file ra kèm <tên>.meta.json ghi nguồn và giấy phép — model lấy từ web PHẢI có giấy phép rõ ràng.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, simplify, textureCompress, meshopt, inspect } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: 'assets-optimized' },
    'max-texture': { type: 'string', default: '2048' },
    simplify: { type: 'string' },
    source: { type: 'string' },
    license: { type: 'string' },
  },
})

if (!positionals.length) {
  console.log('Cách dùng: npm run optimize:glb -- <file.glb | thư-mục> [--out dir] [--max-texture 2048] [--simplify 0.5] [--source url] [--license "..."]')
  process.exit(1)
}

const maxTex = Number(o['max-texture'])
const ratio = o.simplify ? Number(o.simplify) : null

async function listInputs(p) {
  const st = await fs.stat(p)
  if (st.isFile()) return [p]
  const names = await fs.readdir(p)
  return names.filter((n) => /\.(glb|gltf)$/i.test(n)).map((n) => path.join(p, n))
}

function summarize(doc) {
  const r = inspect(doc)
  const tris = r.meshes.properties.reduce((s, m) => s + (m.glPrimitives ?? 0), 0)
  const texBytes = r.textures.properties.reduce((s, t) => s + (t.size ?? 0), 0)
  const maxRes = r.textures.properties.reduce((mx, t) => Math.max(mx, ...(t.resolution ? t.resolution.split('x').map(Number) : [0])), 0)
  return { tris, textures: r.textures.properties.length, texBytes, maxRes }
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`

await MeshoptEncoder.ready
await MeshoptDecoder.ready
if (ratio) await MeshoptSimplifier.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

await fs.mkdir(o.out, { recursive: true })
const rows = []
for (const file of (await Promise.all(positionals.map(listInputs))).flat()) {
  const before = (await fs.stat(file)).size
  const doc = await io.read(file)
  const s0 = summarize(doc)
  const steps = [dedup(), prune(), weld()]
  if (ratio) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001 }))
  steps.push(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTex, maxTex] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  )
  await doc.transform(...steps)
  const s1 = summarize(doc)
  const name = path.basename(file).replace(/\.gltf$/i, '.glb')
  const outFile = path.join(o.out, name)
  await io.write(outFile, doc)
  const after = (await fs.stat(outFile)).size
  await fs.writeFile(
    outFile.replace(/\.glb$/i, '.meta.json'),
    JSON.stringify(
      {
        sourceFile: path.basename(file),
        source: o.source ?? null,
        license: o.license ?? null,
        optimizedAt: new Date().toISOString(),
        bytes: { before, after },
        textures: { before: s0.textures, maxResolution: { before: s0.maxRes, after: s1.maxRes } },
      },
      null,
      2,
    ),
  )
  rows.push({ file: name, before: kb(before), after: kb(after), saved: `${Math.round((1 - after / before) * 100)}%`, maxTex: `${s0.maxRes}→${s1.maxRes}` })
}
console.table(rows)
if (!o.license) {
  console.warn('\n⚠ Chưa ghi --license. Model tải từ web cần giấy phép cho phép dùng (và dùng thương mại nếu app thu phí).')
  console.warn('  Điền vào các file .meta.json trước khi đưa lên CDN.')
}
