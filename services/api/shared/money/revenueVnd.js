/** Quy đổi doanh thu báo cáo về VND; thanh toán vẫn giữ USD/VND theo đơn. */

function getUsdToVndRate() {
  const raw = Number(process.env.USD_TO_VND_RATE);
  return Number.isFinite(raw) && raw > 0 ? raw : 25000;
}

function amountToVnd(amount, currency) {
  const n = Number(amount) || 0;
  if (String(currency || 'VND').toUpperCase() === 'USD') {
    return Math.round(n * getUsdToVndRate());
  }
  return Math.round(n);
}

/** Mongo $sum expression: amount → VND */
function amountToVndAggExpr(amountField = '$amount', currencyField = '$currency') {
  const rate = getUsdToVndRate();
  return {
    $cond: [{ $eq: [currencyField, 'USD'] }, { $multiply: [amountField, rate] }, amountField],
  };
}

module.exports = {
  getUsdToVndRate,
  amountToVnd,
  amountToVndAggExpr,
};
