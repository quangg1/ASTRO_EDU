'use client'

import { Input } from '@/design-system'

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

export function CheckoutCardForm({
  values,
  onChange,
  disabled,
}: {
  values: CheckoutCardFormValues
  onChange: (next: CheckoutCardFormValues) => void
  disabled?: boolean
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ds-border bg-ds-elevated/50 px-3 py-2 text-xs text-ds-muted leading-relaxed">
        Chế độ demo: thông tin thẻ chỉ kiểm tra trên trình duyệt, không gửi lên máy chủ và không
        trừ tiền thật.
      </div>

      <div>
        <label htmlFor="card-name" className="text-xs font-medium text-ds-muted block mb-1.5">
          Tên trên thẻ
        </label>
        <Input
          id="card-name"
          autoComplete="cc-name"
          disabled={disabled}
          value={values.nameOnCard}
          onChange={(e) => set({ nameOnCard: e.target.value })}
          placeholder="NGUYEN VAN A"
        />
      </div>

      <div>
        <label htmlFor="card-number" className="text-xs font-medium text-ds-muted block mb-1.5">
          Số thẻ
        </label>
        <Input
          id="card-number"
          inputMode="numeric"
          autoComplete="cc-number"
          disabled={disabled}
          value={values.cardNumber}
          onChange={(e) => set({ cardNumber: formatCardNumber(e.target.value) })}
          placeholder="4111 1111 1111 1111"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="card-expiry" className="text-xs font-medium text-ds-muted block mb-1.5">
            Hết hạn
          </label>
          <Input
            id="card-expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            disabled={disabled}
            value={values.expiry}
            onChange={(e) => set({ expiry: formatExpiry(e.target.value) })}
            placeholder="MM/YY"
          />
        </div>
        <div>
          <label htmlFor="card-cvc" className="text-xs font-medium text-ds-muted block mb-1.5">
            CVC
          </label>
          <Input
            id="card-cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            disabled={disabled}
            value={values.cvc}
            onChange={(e) => set({ cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="123"
          />
        </div>
      </div>
    </div>
  )
}
