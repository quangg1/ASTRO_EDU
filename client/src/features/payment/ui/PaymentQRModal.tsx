'use client'

/**
 * PaymentQRModal — VNPay in-app QR with graceful redirect fallback.
 *
 * Happy path:
 *   1. Modal opens → `createPaymentQR` mints an Order + asks VNPay
 *      (`vnp_Command=genqr`) for a QR payload string (`qrcontent`).
 *   2. We render that string as a QR via `qrcode.react` inside the modal.
 *   3. Poll `/payments/status/:txnRef` every 3s. When VNPay's IPN flips the
 *      order to `completed`, we show the success state and navigate.
 *
 * Fallback (when the VNPay merchant doesn't have Merchant-hosted QR enabled,
 * `code !== '00'` is returned): we surface the VNPay error message and a
 * button that opens the hosted redirect URL in a new tab. The same IPN
 * fulfils that order, and the existing `/payment/return` page handles the
 * browser bounce-back if the user pays in the same tab.
 *
 * @see https://vnpay.js.org/generate-qr
 * @see https://vnpay.js.org/ipn/verify-ipn-call
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button, Dialog, DialogFooter, DialogCloseButton, useToast } from '@/design-system'
import { forUserFacingError } from '@/lib/sanitizeUserError'
import { userMessages } from '@/lib/userMessages'
import {
  createPaymentQR,
  createPaymentUrl,
  fetchPaymentStatus,
  type PaymentQRTicket,
} from '../api/paymentApi'

type Phase = 'loading' | 'awaiting-qr' | 'awaiting-url' | 'completed' | 'error'

export interface PaymentQRModalProps {
  open: boolean
  courseId: string
  /** Called once VNPay's IPN confirms the order. Receives the slug to navigate to. */
  onCompleted: (courseSlug: string) => void
  onClose: () => void
}

const POLL_INTERVAL_MS = 3000

export function PaymentQRModal({ open, courseId, onCompleted, onClose }: PaymentQRModalProps) {
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('loading')
  const [ticket, setTicket] = useState<PaymentQRTicket | null>(null)
  const [redirectUrl, setRedirectUrl] = useState<string>('')
  const [activeTxnRef, setActiveTxnRef] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Stash the latest txnRef so the polling timer can read the freshest value
  // without we redoing setInterval whenever React re-renders.
  const txnRefRef = useRef<string>('')
  txnRefRef.current = activeTxnRef

  // ── Step 1: try QR first. ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPhase('loading')
    setTicket(null)
    setRedirectUrl('')
    setActiveTxnRef('')
    setErrorMsg('')

    ;(async () => {
      const result = await createPaymentQR({ courseId })
      if (cancelled) return
      if (result.success) {
        setTicket(result.data)
        setActiveTxnRef(result.data.txnRef)
        setPhase('awaiting-qr')
      } else {
        // Surface the VNPay message but keep the modal open so the user can
        // try the redirect fallback from the same UI.
        setErrorMsg(forUserFacingError(result.error, userMessages.paymentQrFailed))
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, courseId])

  // ── Step 2: poll status while awaiting payment. ─────────────────────────
  useEffect(() => {
    if (!open) return
    if (phase !== 'awaiting-qr' && phase !== 'awaiting-url') return
    if (!activeTxnRef) return
    let cancelled = false

    const tick = async () => {
      const status = await fetchPaymentStatus(txnRefRef.current)
      if (cancelled || !status) return
      if (status.status === 'completed') {
        setPhase('completed')
        toast.show('Thanh toán thành công — đã enroll', { tone: 'success' })
        window.setTimeout(() => onCompleted(status.courseSlug), 1200)
      } else if (status.status === 'failed' || status.status === 'cancelled') {
        setPhase('error')
        setErrorMsg('Đơn hàng đã bị huỷ hoặc thất bại.')
      }
    }

    const timer = window.setInterval(tick, POLL_INTERVAL_MS)
    tick()
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [open, phase, activeTxnRef, toast, onCompleted])

  // ── Fallback action: open the hosted VNPay redirect URL. ────────────────
  const openRedirect = useCallback(async () => {
    setPhase('loading')
    const result = await createPaymentUrl({ courseId })
    if (!result.success) {
      setErrorMsg(forUserFacingError(result.error, userMessages.paymentUrlFailed))
      setPhase('error')
      return
    }
    setRedirectUrl(result.paymentUrl)
    setActiveTxnRef(result.txnRef)
    setPhase('awaiting-url')
    // Open in a new tab so the user can come back here to see the success
    // state; we also keep polling status in this window.
    window.open(result.paymentUrl, '_blank', 'noopener,noreferrer')
  }, [courseId])

  const handleClose = useCallback(() => {
    if (phase === 'loading') return
    onClose()
  }, [phase, onClose])

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="lg"
      dismissOnBackdrop={phase !== 'loading'}
      title="Thanh toán khoá học"
      description={
        phase === 'awaiting-qr'
          ? 'Quét QR bằng app ngân hàng VNPay / NAPAS hỗ trợ VietQR'
          : phase === 'awaiting-url'
            ? 'Hoàn tất thanh toán trên cửa sổ VNPay vừa mở.'
            : undefined
      }
    >
      <DialogCloseButton onClose={handleClose} />

      {phase === 'loading' && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-ds-border border-t-ds-accent animate-spin" />
          <p className="text-sm text-ds-muted">Đang chuẩn bị thanh toán…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-sm text-ds-warning">{errorMsg || 'Đã xảy ra lỗi.'}</p>
          <p className="text-xs text-ds-muted leading-relaxed">
            Bạn có thể thử thanh toán trên trang VNPay (mở tab mới).
          </p>
          <DialogFooter className="w-full">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            <Button onClick={openRedirect}>Mở trang thanh toán VNPay</Button>
          </DialogFooter>
        </div>
      )}

      {phase === 'completed' && (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <div
            aria-hidden
            className="h-12 w-12 rounded-full bg-ds-accent-soft flex items-center justify-center text-ds-accent text-2xl"
          >
            ✓
          </div>
          <p className="text-base font-medium text-ds-text">Đã nhận thanh toán</p>
          <p className="text-sm text-ds-muted">Đang chuyển đến khoá học…</p>
        </div>
      )}

      {phase === 'awaiting-qr' && ticket && (
        <div className="grid gap-4 sm:grid-cols-[208px_1fr] sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 rounded-md border border-ds-border bg-white">
              <QRCodeSVG
                value={ticket.qrContent}
                size={192}
                level="M"
                marginSize={0}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <p className="text-xs text-ds-muted text-center">
              Mã hết hạn sau ~{Math.round(ticket.expiresInSec / 60)} phút.
            </p>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-ds-muted">Mã đơn</dt>
            <dd className="text-ds-text font-mono break-all">{ticket.txnRef}</dd>

            <dt className="text-ds-muted">Số tiền</dt>
            <dd className="text-ds-accent font-semibold">
              {ticket.amount.toLocaleString('vi-VN')} {ticket.currency}
            </dd>

            <dt className="text-ds-muted">Cổng</dt>
            <dd className="text-ds-text">VNPay · VietQR</dd>
          </dl>

          <p className="sm:col-span-2 text-xs text-ds-muted leading-relaxed">
            Sau khi VNPay xác nhận giao dịch, hệ thống sẽ tự động enroll khoá học cho bạn.
          </p>

          <div className="sm:col-span-2 flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2 text-xs text-ds-muted">
              <span className="h-2 w-2 rounded-full bg-ds-accent animate-pulse" />
              Đang chờ thanh toán…
            </div>
            <Button variant="ghost" onClick={openRedirect}>
              Hoặc mở trang VNPay
            </Button>
          </div>
        </div>
      )}

      {phase === 'awaiting-url' && (
        <div className="flex flex-col items-start gap-3 py-2 text-sm">
          <p className="text-ds-text">Cửa sổ thanh toán VNPay đã được mở ở tab mới.</p>
          {redirectUrl && (
            <a
              href={redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ds-accent underline break-all text-xs"
            >
              {redirectUrl}
            </a>
          )}
          <div className="flex items-center gap-2 text-xs text-ds-muted">
            <span className="h-2 w-2 rounded-full bg-ds-accent animate-pulse" />
            Đang chờ VNPay xác nhận giao dịch…
          </div>
          <DialogFooter className="w-full">
            <Button variant="ghost" onClick={onClose}>
              Đóng (giao dịch vẫn tiếp tục)
            </Button>
          </DialogFooter>
        </div>
      )}
    </Dialog>
  )
}
