import fs from 'fs'
import path from 'path'

const transcriptDir = path.resolve(
  process.env.USERPROFILE || '',
  '.cursor/projects/d-galaxies/agent-transcripts',
)

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p, acc)
    else if (f.endsWith('.jsonl')) acc.push(p)
  }
  return acc
}

let best = null
for (const file of walk(transcriptDir)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  for (const line of lines) {
    if (!line.includes('viMessages') && !line.includes('locales/vi.ts')) continue
    try {
      const obj = JSON.parse(line)
      for (const c of obj.message?.content || []) {
        if (c.type !== 'tool_use') continue
        const p = c.input?.path || ''
        if (!p.includes('vi.ts')) continue
        if (c.input?.contents?.includes('viMessages')) {
          const len = c.input.contents.length
          if (!best || len > best.len) best = { len, contents: c.input.contents, file, op: c.name }
        }
        if (c.name === 'StrReplace' && c.input?.new_string) {
          // track largest patch additions containing vi keys
        }
      }
    } catch {
      /* skip */
    }
  }
}

const out = path.resolve('client/src/i18n/locales/vi-best.ts')
if (best) {
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, best.contents)
  console.log('best write', best.len, 'from', path.basename(best.file))
} else {
  console.log('no vi.ts write found')
}
