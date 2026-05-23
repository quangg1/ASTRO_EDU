/**
 * Thin wrapper around the official `vnpay` Node SDK
 * (https://vnpay.js.org — lehuygiang28/vnpay).
 *
 * The SDK handles HMAC-SHA512 signing, GET-call to VNPay endpoints, and
 * response normalization. We expose only the three primitives we need:
 *
 *   • `buildPaymentUrl({ amount, ipAddr, txnRef, orderInfo, returnUrl })`
 *       → Returns a hosted payment URL. Use when the merchant does NOT have
 *         Merchant-hosted QR enabled, or as a graceful fallback.
 *
 *   • `generateQrContent({ amount, ipAddr, txnRef, orderInfo, returnUrl })`
 *       → Calls VNPay `vnp_Command=genqr`. On success returns the QR
 *         payload string (EMV/VietQR text). The client renders this as an
 *         image with `qrcode.react`. May fail with VNPay code !== '00' if
 *         the merchant agreement doesn't include QR.
 *
 *   • `verifyIpnCall(query)`      → Verifies an IPN GET callback.
 *   • `verifyReturnUrl(query)`    → Verifies a browser-redirect return URL.
 *
 * IMPORTANT: this module is `require`d lazily by the route handlers so the
 * server still starts when VNPay env vars are missing — that lets developers
 * boot the API for non-payment work without a sandbox account.
 */

const { VNPay, ProductCode, VnpLocale, dateFormat, ignoreLogger } = require('vnpay')
const ENV = require('../../../../../shared/envNames')

let cached = null

function getVNPay() {
  if (cached) return cached
  const tmnCode = process.env[ENV.VNPAY_TMN_CODE]
  const secureSecret = process.env[ENV.VNPAY_HASH_SECRET]
  const vnpayHost = process.env[ENV.VNPAY_HOST]
  if (!tmnCode || !secureSecret) {
    throw new Error(`VNPay chưa được cấu hình: thiếu ${ENV.VNPAY_TMN_CODE} hoặc ${ENV.VNPAY_HASH_SECRET}`)
  }
  if (!vnpayHost) {
    throw new Error(`VNPay chưa được cấu hình: thiếu ${ENV.VNPAY_HOST}`)
  }
  cached = new VNPay({
    tmnCode,
    secureSecret,
    vnpayHost,
    testMode: process.env[ENV.VNPAY_TEST_MODE] !== 'false',
    hashAlgorithm: 'SHA512',
    enableLog: false,
    loggerFn: ignoreLogger,
  })
  return cached
}

function commonParams({ amount, ipAddr, txnRef, orderInfo, returnUrl }) {
  // VNPay requires non-Vietnamese-diacritic order info; callers should pass
  // ASCII-only strings, but we strip diacritics defensively here as well.
  const cleanOrderInfo = String(orderInfo || `Thanh toan don hang ${txnRef}`)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return {
    vnp_Amount: Math.round(amount),
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: cleanOrderInfo,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: returnUrl,
    vnp_Locale: VnpLocale.VN,
  }
}

/** Returns the hosted payment URL (redirect flow). */
function buildPaymentUrl(params) {
  return getVNPay().buildPaymentUrl(commonParams(params))
}

/**
 * Returns `{ code, message, qrContent }`. On success `code === '00'` and
 * `qrContent` holds the VietQR string. Caller decides whether to fall back
 * to `buildPaymentUrl` when `code !== '00'`.
 */
async function generateQrContent(params) {
  // The SDK requires `vnp_CreateDate` + `vnp_ExpireDate` (GMT+7, yyyyMMddHHmmss)
  // for QR — short window keeps stale QRs from being scanned later.
  const start = new Date()
  const end = new Date(start.getTime() + 15 * 60 * 1000)
  const result = await getVNPay().generateQr({
    ...commonParams(params),
    vnp_CreateDate: dateFormat(start),
    vnp_ExpireDate: dateFormat(end),
  })
  return {
    code: String(result.code || ''),
    message: String(result.message || ''),
    qrContent: result.code === '00' ? String(result.qrcontent || '') : '',
  }
}

/** Verifies an IPN GET-callback. Returns the SDK's `VerifyIpnCall` object. */
function verifyIpnCall(query) {
  return getVNPay().verifyIpnCall(query)
}

/** Verifies a browser-redirect return URL. Returns the SDK's verification object. */
function verifyReturnUrl(query) {
  return getVNPay().verifyReturnUrl(query)
}

module.exports = {
  buildPaymentUrl,
  generateQrContent,
  verifyIpnCall,
  verifyReturnUrl,
}
