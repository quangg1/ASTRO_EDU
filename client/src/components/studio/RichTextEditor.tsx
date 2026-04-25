'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import LinkExt from '@tiptap/extension-link'
import ImageExt from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extension-placeholder'
import { useCallback, useEffect, useRef } from 'react'

const COLORS = ['#ffffff', '#94a3b8', '#22d3ee', '#34d399', '#facc15', '#f87171', '#c084fc', '#fb923c']
const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
]
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px']

const FontFamilyExt = Extension.create({
  name: 'fontFamily',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily || null,
            renderHTML: (attributes) =>
              attributes.fontFamily ? { style: `font-family:${attributes.fontFamily}` } : {},
          },
        },
      },
    ]
  },
})

const FontSizeExt = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size:${attributes.fontSize}` } : {},
          },
        },
      },
    ]
  },
})

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

const ResizableImageExt = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const inlineWidth = element.style.width || ''
          const attrWidth = element.getAttribute('width') || ''
          const fromStyle = Number.parseInt(inlineWidth.replace('px', '').trim(), 10)
          const fromAttr = Number.parseInt(attrWidth, 10)
          if (Number.isFinite(fromStyle) && fromStyle > 0) return fromStyle
          if (Number.isFinite(fromAttr) && fromAttr > 0) return fromAttr
          return null
        },
        renderHTML: (attributes) => {
          if (!attributes.width || Number(attributes.width) <= 0) return {}
          return {
            style: `width:${Number(attributes.width)}px;max-width:100%;height:auto;`,
            width: String(Number(attributes.width)),
          }
        },
      },
    }
  },
})

function ToolBtn({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${active ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const resizeStateRef = useRef<{
    img: HTMLImageElement
    pos: number
    startX: number
    startWidth: number
  } | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextStyle,
      FontFamilyExt,
      FontSizeExt,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LinkExt.configure({ openOnClick: false }),
      ResizableImageExt,
      Placeholder.configure({ placeholder: placeholder || 'Start typing...' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none text-gray-200 leading-relaxed',
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editor) return
    const root = editor.view.dom as HTMLElement

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target || target.tagName !== 'IMG') return
      const img = target as HTMLImageElement
      const rect = img.getBoundingClientRect()
      const nearRight = rect.right - event.clientX <= 16
      const nearBottom = rect.bottom - event.clientY <= 16
      if (!nearRight || !nearBottom) return

      const pos = editor.view.posAtDOM(img, 0)
      const node = editor.state.doc.nodeAt(pos)
      if (!node || node.type.name !== 'image') return

      event.preventDefault()
      resizeStateRef.current = {
        img,
        pos,
        startX: event.clientX,
        startWidth: img.getBoundingClientRect().width,
      }
      img.classList.add('lp-image-resizing')
    }

    const onMouseMove = (event: MouseEvent) => {
      const st = resizeStateRef.current
      if (!st) return
      event.preventDefault()
      const deltaX = event.clientX - st.startX
      const nextWidth = Math.max(120, Math.round(st.startWidth + deltaX))
      st.img.style.width = `${nextWidth}px`
      st.img.style.maxWidth = '100%'
      st.img.style.height = 'auto'
    }

    const onMouseUp = () => {
      const st = resizeStateRef.current
      if (!st) return
      const appliedWidth = Math.max(120, Math.round(st.img.getBoundingClientRect().width))
      st.img.classList.remove('lp-image-resizing')
      const node = editor.state.doc.nodeAt(st.pos)
      if (node && node.type.name === 'image') {
        const tr = editor.state.tr.setNodeMarkup(st.pos, undefined, {
          ...node.attrs,
          width: appliedWidth,
        })
        editor.view.dispatch(tr)
      }
      resizeStateRef.current = null
    }

    root.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      root.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt('Image URL')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="rounded-xl border border-white/15 bg-black/40 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/5">
        {/* Text format */}
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></ToolBtn>
        <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><s>S</s></ToolBtn>
        <ToolBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code"><span className="font-mono">&lt;&gt;</span></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting">Tx</ToolBtn>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Font family + size (Gmail-like controls) */}
        <select
          value={String(editor.getAttributes('textStyle').fontFamily || '')}
          onChange={(e) => {
            const val = e.target.value
            if (!val) editor.chain().focus().setMark('textStyle', { fontFamily: null }).run()
            else editor.chain().focus().setMark('textStyle', { fontFamily: val }).run()
          }}
          className="h-7 rounded border border-white/15 bg-black/40 px-2 text-[11px] text-slate-200 focus:border-cyan-500/50 focus:outline-none"
          title="Font family"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={String(editor.getAttributes('textStyle').fontSize || '')}
          onChange={(e) => {
            const val = e.target.value
            if (!val) editor.chain().focus().setMark('textStyle', { fontSize: null }).run()
            else editor.chain().focus().setMark('textStyle', { fontSize: val }).run()
          }}
          className="h-7 w-[74px] rounded border border-white/15 bg-black/40 px-2 text-[11px] text-slate-200 focus:border-cyan-500/50 focus:outline-none"
          title="Font size"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Headings */}
        <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</ToolBtn>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Lists */}
        <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">&#x2022;</ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1.</ToolBtn>
        <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">&#x201C;</ToolBtn>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Alignment */}
        <ToolBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">&#x2261;</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">&#x2263;</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">&#x2262;</ToolBtn>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Color swatches */}
        <div className="flex items-center gap-0.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c).run() }}
              className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform"
              style={{ backgroundColor: c }}
              title={`Text color ${c}`}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Highlight */}
        <ToolBtn active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#facc15' }).run()} title="Highlight">
          <span className="bg-yellow-400/60 px-0.5 rounded text-black">H</span>
        </ToolBtn>

        {/* Link */}
        <ToolBtn active={editor.isActive('link')} onClick={setLink} title="Link">&#x1F517;</ToolBtn>

        {/* Image */}
        <ToolBtn onClick={addImage} title="Insert image">&#x1F5BC;</ToolBtn>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">&#x21A9;</ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">&#x21AA;</ToolBtn>
      </div>

      <EditorContent editor={editor} />
      <style jsx>{`
        :global(.ProseMirror img) {
          max-width: 100%;
          height: auto;
          cursor: default;
          position: relative;
        }
        :global(.ProseMirror img:hover) {
          outline: 1px dashed rgba(34, 211, 238, 0.45);
          outline-offset: 2px;
        }
        :global(.ProseMirror img.lp-image-resizing) {
          user-select: none;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
