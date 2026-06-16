'use client'

import type { ComponentProps } from 'react'
import { CreditCard } from 'lucide-react'
import { Input } from '@/design-system'
import { cn } from '@/lib/cn'

export interface CheckoutCardFormValues {
  nameOnCard: string
  cardNumber: string
  expiry: string
  cvc: string
}

export function validateDemoCardForm(values: CheckoutCardFormValues): string | null {
  const name = values.nameOnCard.trim()
  if (name.length < 2) return 'Nhập tên trên thẻ (ít nhất 2 ký tự).'
  const digits = values.cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return 'Số thẻ không hợp lệ (demo: nhập 13–19 chữ số).'
  if (!/^\d{2}\/\d{2}$/.test(values.expiry.trim())) return 'Hết hạn theo dạng MM/YY.'
  const cvc = values.cvc.replace(/\D/g, '')
  if (cvc.length < 3 || cvc.length > 4) return 'CVC không hợp lệ.'
  return null
}

const glassInputClass =
  'cosmo-input-surface block w-full rounded-[var(--radius-control)] border px-4 py-3 text-sm text-ds-text placeholder:text-ds-subtle transition-colors focus:outline-none focus:border-ds-accent disabled:cursor-not-allowed disabled:opacity-60'

/** Must live outside CheckoutCardForm — inline component remounts inputs every keystroke. */
function GlassInput(props: ComponentProps<'input'>) {
  return <input {...props} className={cn(glassInputClass, props.className)} />
}

export function CheckoutCardForm({
  values,
  onChange,
  disabled,
  variant = 'default',
}: {
  values: CheckoutCardFormValues
  onChange: (next: CheckoutCardFormValues) => void
  disabled?: boolean
  variant?: 'default' | 'glass'
}) {
  const set = (patch: Partial<CheckoutCardFormValues>) => onChange({ ...values, ...patch })

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 19)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
  }

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  const isGlass = variant === 'glass'
  const labelClass = cn(
    'font-medium text-ds-muted block mb-2',
    isGlass ? 'text-sm' : 'text-xs',
  )

  return (
    <div className="space-y-5">
      {!isGlass && (
        <div className="rounded-xl border border-ds-border bg-ds-elevated/50 px-3 py-2 text-xs text-ds-muted leading-relaxed">
          Chế độ demo: thông tin thẻ chỉ kiểm tra trên trình duyệt, không gửi lên máy chủ và không
          trừ tiền thật.
        </div>
      )}

      <div>
        <label htmlFor="card-name" className={labelClass}>
          Tên trên thẻ
        </label>
        {isGlass ? (
          <GlassInput
            id="card-name"
            autoComplete="cc-name"
            disabled={disabled}
            value={values.nameOnCard}
            onChange={(e) => set({ nameOnCard: e.target.value })}
            placeholder="NGUYEN VAN A"
          />
        ) : (
          <Input
            id="card-name"
            autoComplete="cc-name"
            disabled={disabled}
            value={values.nameOnCard}
            onChange={(e) => set({ nameOnCard: e.target.value })}
            placeholder="NGUYEN VAN A"
          />
        )}
      </div>

      <div>
        <label htmlFor="card-number" className={labelClass}>
          Số thẻ
        </label>
        <div className={isGlass ? 'relative' : undefined}>
          {isGlass ? (
            <GlassInput
              id="card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              disabled={disabled}
              value={values.cardNumber}
              onChange={(e) => set({ cardNumber: formatCardNumber(e.target.value) })}
              placeholder="4111 1111 1111 1111"
              className="pr-11"
            />
          ) : (
            <Input
              id="card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              disabled={disabled}
              value={values.cardNumber}
              onChange={(e) => set({ cardNumber: formatCardNumber(e.target.value) })}
              placeholder="4111 1111 1111 1111"
            />
          )}
          {isGlass && (
            <CreditCard
              className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ds-subtle"
              aria-hidden
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="card-expiry" className={labelClass}>
            Ngày hết hạn
          </label>
          {isGlass ? (
            <GlassInput
              id="card-expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              disabled={disabled}
              value={values.expiry}
              onChange={(e) => set({ expiry: formatExpiry(e.target.value) })}
              placeholder="MM/YY"
            />
          ) : (
            <Input
              id="card-expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              disabled={disabled}
              value={values.expiry}
              onChange={(e) => set({ expiry: formatExpiry(e.target.value) })}
              placeholder="MM/YY"
            />
          )}
        </div>
        <div>
          <label htmlFor="card-cvc" className={labelClass}>
            CVV
          </label>
          {isGlass ? (
            <GlassInput
              id="card-cvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              disabled={disabled}
              value={values.cvc}
              onChange={(e) => set({ cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              placeholder="123"
            />
          ) : (
            <Input
              id="card-cvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              disabled={disabled}
              value={values.cvc}
              onChange={(e) => set({ cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              placeholder="123"
            />
          )}
        </div>
      </div>

      {isGlass && (
        <p className="text-[11px] text-ds-subtle leading-relaxed">
          Chế độ demo — thẻ không gửi lên máy chủ và không trừ tiền thật.
        </p>
      )}
    </div>
  )
}
