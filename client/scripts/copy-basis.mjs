// Copy bộ giải mã Basis (KTX2) từ three vào public/basis/ để KTX2Loader dùng (xem gltfAssetCache.ts).
import fs from 'node:fs/promises'
import path from 'node:path'
const src = path.resolve('node_modules/three/examples/jsm/libs/basis')
const dst = path.resolve('public/basis')
await fs.mkdir(dst, { recursive: true })
for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm']) await fs.copyFile(path.join(src, f), path.join(dst, f))
console.log('copy-basis: ok')
