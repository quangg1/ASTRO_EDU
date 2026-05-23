/**
 * Build Next.js static export (`out/`) cho Render Static Site.
 * Tạm gỡ `src/app/api` vì route handlers không hỗ trợ `output: 'export'`.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = path.join(root, 'src', 'app', 'api')
const apiBackup = path.join(root, 'src', 'app', '__api_static_backup__')

let movedApi = false

function rmDir(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true })
}

function moveApiAside() {
  if (!fs.existsSync(apiDir)) return
  rmDir(apiBackup)
  try {
    fs.renameSync(apiDir, apiBackup)
  } catch {
    fs.cpSync(apiDir, apiBackup, { recursive: true })
    rmDir(apiDir)
  }
  movedApi = true
}

function restoreApi() {
  if (!movedApi) return
  rmDir(apiDir)
  try {
    fs.renameSync(apiBackup, apiDir)
  } catch {
    fs.cpSync(apiBackup, apiDir, { recursive: true })
    rmDir(apiBackup)
  }
  movedApi = false
}

moveApiAside()
try {
  execSync('npx next build', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, RENDER_STATIC: 'true' },
  })
} finally {
  restoreApi()
}
