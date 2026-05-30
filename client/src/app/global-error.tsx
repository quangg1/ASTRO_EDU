'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#03060f] text-white">
        <div className="min-h-screen w-full grid place-items-center p-6">
          <div className="max-w-xl w-full rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-sm text-red-100">
            <h2 className="text-base font-semibold">Ứng dụng gặp lỗi nghiêm trọng.</h2>
            <p className="mt-2 text-red-200/90">{error?.message || 'Lỗi không xác định'}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-1.5 text-xs hover:bg-red-500/30"
            >
              Tải lại
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

