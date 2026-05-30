'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import LinkExt from '@tiptap/extension-link'
import ImageExt from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extension-placeholder'
import { uploadMedia } from '@/features/courses/api/coursesApi'
import { COMMENT_EMOJI_GROUPS } from '@/components/community/comments/emojiPicker'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
}

function ToolBtn({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`h-8 min-w-8 px-1.5 flex items-center justify-center rounded-md text-sm transition-colors disabled:opacity-40 ${
        active ? 'bg-cyan-600/80 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function CommentRichEditor({ value, onChange, placeholder, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({ codeBlock: false, heading: { levels: [3] } }),
      Underline,
      LinkExt.configure({ openOnClick: false, autolink: true }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder || 'Viết bình luận…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm max-w-none min-h-[72px] max-h-[280px] overflow-y-auto px-3 py-2 focus:outline-none text-gray-200 leading-relaxed',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  const insertEmoji = useCallback(
    (emoji: string) => {
      if (!editor) return
      editor.chain().focus().insertContent(emoji).run()
      setEmojiOpen(false)
    },
    [editor],
  )

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const onPickImage = useCallback(
    async (file: File | null) => {
      if (!file || !editor) return
      if (!file.type.startsWith('image/')) {
        alert('Chỉ hỗ trợ file ảnh')
        return
      }
      if (file.size > 8 * 1024 * 1024) {
        alert('Ảnh tối đa 8MB')
        return
      }
      setUploading(true)
      const res = await uploadMedia(file, { purpose: 'generic', variant: 'community-comment' })
      setUploading(false)
      if (res.success && res.url) {
        editor.chain().focus().setImage({ src: res.url, alt: file.name }).run()
      } else {
        alert(res.error || 'Không tải được ảnh')
      }
    },
    [editor],
  )

  if (!editor) {
    return <div className="min-h-[100px] rounded-xl border border-white/15 bg-black/30 animate-pulse" />
  }

  return (
    <div className="relative rounded-xl border border-white/15 bg-black/30 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/[0.04]">
        <ToolBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="In đậm"
          disabled={disabled}
        >
          <b>B</b>
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="In nghiêng"
          disabled={disabled}
        >
          <i>I</i>
        </ToolBtn>
        <ToolBtn active={editor.isActive('link')} onClick={setLink} title="Liên kết" disabled={disabled}>
          🔗
        </ToolBtn>
        <ToolBtn
          onClick={() => fileRef.current?.click()}
          title="Chèn ảnh"
          disabled={disabled || uploading}
        >
          {uploading ? '…' : '🖼'}
        </ToolBtn>
        <ToolBtn onClick={() => setEmojiOpen((v) => !v)} title="Emoji" disabled={disabled}>
          😀
        </ToolBtn>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            void onPickImage(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
      </div>

      {emojiOpen && (
        <div className="absolute left-2 top-11 z-20 w-[min(100%,320px)] rounded-xl border border-white/15 bg-[#0c1424] shadow-xl p-2 max-h-48 overflow-y-auto">
          {COMMENT_EMOJI_GROUPS.map((g) => (
            <div key={g.label} className="mb-2 last:mb-0">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 px-1 mb-1">{g.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {g.emojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="text-lg leading-none p-1.5 rounded hover:bg-white/10"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertEmoji(em)
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
