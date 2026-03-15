const crypto = require('crypto');

const VNPAY_URL = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

function createSecureHash(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const signData = sortedKeys
    .filter((k) => params[k] !== '' && params[k] !== null && params[k] !== undefined)
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHmac('sha512', secretKey).update(signData).digest('hex');
}

function buildPaymentUrl(opts) {
  const tmnCode = process.env.VNPAY_TMN_CODE || '';
  const secretKey = process.env.VNPAY_HASH_SECRET || '';
  const returnUrl = opts.returnUrl || `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/return`;
  const vnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: Math.round(opts.amount) * 100,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: opts.orderId,
    vnp_OrderInfo: opts.orderInfo || `Thanh toan khoa hoc ${opts.courseSlug || ''}`,
    vnp_OrderType: 'other',
    vnp_Locale: opts.locale || 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: opts.ipAddr || '127.0.0.1',
    vnp_CreateDate: new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14),
  };
  const secureHash = createSecureHash(vnpParams, secretKey);
  vnpParams.vnp_SecureHash = secureHash;
  const query = new URLSearchParams(vnpParams).toString();
  return `${VNPAY_URL}?${query}`;
}

function verifyReturnUrl(query, secretKey) {
  const vnpParams = { ...query };
  const vnpSecureHash = vnpParams.vnp_SecureHash || vnpParams.vnp_SecureHashType;
  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;
  const calculated = createSecureHash(vnpParams, secretKey);
  return calculated === vnpSecureHash;
}

module.exports = { buildPaymentUrl, verifyReturnUrl, createSecureHash };
