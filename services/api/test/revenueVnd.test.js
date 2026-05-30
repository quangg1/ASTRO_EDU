const test = require('node:test');
const assert = require('node:assert/strict');
const { amountToVnd, getUsdToVndRate } = require('../shared/money/revenueVnd');

test('amountToVnd converts USD using rate', () => {
  const prev = process.env.USD_TO_VND_RATE;
  process.env.USD_TO_VND_RATE = '25000';
  assert.equal(amountToVnd(10, 'USD'), 250000);
  assert.equal(amountToVnd(100000, 'VND'), 100000);
  process.env.USD_TO_VND_RATE = prev;
});

test('getUsdToVndRate defaults when unset', () => {
  const prev = process.env.USD_TO_VND_RATE;
  delete process.env.USD_TO_VND_RATE;
  assert.equal(getUsdToVndRate(), 25000);
  process.env.USD_TO_VND_RATE = prev;
});
