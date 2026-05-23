'use client'

type StageOption = { value: number; label: string }

type Props = {
  label: string
  options: StageOption[]
  value: number[] | undefined
  onChange: (ids: number[] | undefined) => void
  placeholder?: string
}

export function StageMultiSelect({ label, options, value, onChange, placeholder }: Props) {
  const selected = value ?? []

  const toggle = (id: number) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id].sort((a, b) => a - b)
    onChange(next.length ? next : undefined)
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-[11px] font-medium text-slate-300">{label}</legend>
      <p className="text-[10px] text-ds-subtle">{placeholder ?? 'Để trống = hiện ở mọi thời kỳ (hoặc quy tắc legacy).'}</p>
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-lg border border-ds-border bg-black/20 p-2">
        {options.map((opt) => {
          const on = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={
                on
                  ? 'rounded-md border border-violet-500/50 bg-violet-700/40 px-2 py-1 text-[10px] text-violet-50'
                  : 'rounded-md border border-ds-border px-2 py-1 text-[10px] text-slate-400 hover:bg-white/5'
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {selected.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-[10px] text-cyan-400 hover:underline"
        >
          Xóa lọc — hiện mọi thời kỳ
        </button>
      ) : null}
    </fieldset>
  )
}
