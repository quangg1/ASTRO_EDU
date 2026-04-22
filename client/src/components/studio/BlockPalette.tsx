'use client'

import { useState } from 'react'
import type { LessonSection, SectionType } from '@/lib/coursesApi'

interface BlockDef {
  type: SectionType
  label: string
  icon: string
  description: string
  category: 'content' | 'media' | 'interactive' | 'layout'
}

const BLOCKS: BlockDef[] = [
  { type: 'richtext', label: 'Rich Text', icon: '\u270D', description: 'Formatted text with styles, colors, lists', category: 'content' },
  { type: 'text', label: 'Plain Text', icon: '\u2261', description: 'Simple text block', category: 'content' },
  { type: 'callout', label: 'Callout', icon: '\u26A0', description: 'Info, warning, tip, or danger box', category: 'content' },
  { type: 'code', label: 'Code Block', icon: '\u2328', description: 'Syntax-highlighted code snippet', category: 'content' },
  { type: 'math', label: 'Math / Formula', icon: '\u2211', description: 'LaTeX công thức toán, thiên văn', category: 'content' },
  { type: 'image', label: 'Image / GIF', icon: '\u1F5BC', description: 'Static image, GIF, or animated image', category: 'media' },
  { type: 'gif', label: 'GIF / Animation', icon: '\u2728', description: 'Animated GIF or Lottie animation', category: 'media' },
  { type: 'video', label: 'Video', icon: '\u25B6', description: 'YouTube embed or uploaded video', category: 'media' },
  { type: '3d', label: '3D Model', icon: '\u2B22', description: 'Interactive GLB/GLTF 3D viewer', category: 'media' },
  { type: 'chart', label: 'Chart', icon: '\u2237', description: 'Biểu đồ tương tác (line, bar, pie)', category: 'interactive' },
  { type: 'slider', label: 'Slider', icon: '\u2194', description: 'Kéo slider cập nhật công thức (TensorTonic-style)', category: 'interactive' },
  { type: 'embed', label: 'Embed', icon: '\u29C9', description: 'Canva, Google Slides, Figma, iframe', category: 'interactive' },
  { type: 'observable', label: 'Observable', icon: '\u29E8', description: 'Embed notebook Observable.js', category: 'interactive' },
  { type: 'divider', label: 'Divider', icon: '\u2500', description: 'Visual section separator', category: 'layout' },
]

const CATEGORIES = [
  { key: 'content', label: 'Content' },
  { key: 'media', label: 'Media' },
  { key: 'interactive', label: 'Interactive' },
  { key: 'layout', label: 'Layout' },
] as const

function makeDefaultSection(type: SectionType): LessonSection {
  const mediaTypes: SectionType[] = ['image', 'gif', 'video', '3d', 'embed', 'observable']
  const base: LessonSection = {
    type,
    title: '',
    content: '',
    sectionLevel: mediaTypes.includes(type) ? 'sub' : 'main',
  }
  switch (type) {
    case 'richtext': return { ...base, html: '<p></p>' }
    case 'callout': return { ...base, calloutVariant: 'info', content: '' }
    case 'code': return { ...base, code: '', language: 'javascript' }
    case 'math': return { ...base, latex: 'E = mc^2' }
    case 'image': return { ...base, imageUrl: null, caption: '' }
    case 'gif': return { ...base, imageUrl: null, caption: '' }
    case 'video': return { ...base, videoUrl: null }
    case '3d': return { ...base, modelUrl: null }
    case 'chart': return { ...base, chartType: 'line', chartData: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }] }
    case 'slider': return { ...base, sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderFormula: 'x^2', sliderLabel: 'x', sliderUnit: '' }
    case 'embed': return { ...base, embedUrl: null, embedType: 'iframe' }
    case 'observable': return { ...base, notebookUrl: null }
    case 'divider': return { ...base }
    default: return base
  }
}

interface Props {
  onAdd: (section: LessonSection) => void
}

export default function BlockPalette({ onAdd }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-white/15 text-gray-500 hover:border-cyan-500/40 hover:text-cyan-300 transition-all text-sm flex items-center justify-center gap-2"
      >
        <span className="text-lg">+</span> Add Block
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-[#060b14] p-4 space-y-4 shadow-2xl shadow-cyan-500/5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Insert Block</h4>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white">&times; Close</button>
      </div>
      {CATEGORIES.map((cat) => {
        const items = BLOCKS.filter((b) => b.category === cat.key)
        if (!items.length) return null
        return (
          <div key={cat.key}>
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">{cat.label}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {items.map((b) => (
                <button
                  key={b.type}
                  onClick={() => { onAdd(makeDefaultSection(b.type)); setOpen(false) }}
                  className="flex items-start gap-2 p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all text-left group"
                >
                  <span className="text-lg mt-0.5 group-hover:scale-110 transition-transform">{b.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{b.label}</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{b.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
