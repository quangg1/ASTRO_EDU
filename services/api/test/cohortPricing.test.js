const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCohortPrice, computeCohortUpgradeDue } = require('../features/courses/lib/cohortPricing');

const course = { price: 30, currency: 'USD', isPaid: true, cohortPrice: 45, cohortCurrency: 'USD' };

test('resolveCohortPrice uses course.cohortPrice over catalog', () => {
  const p = resolveCohortPrice({}, course);
  assert.equal(p.price, 45);
  assert.equal(p.currency, 'USD');
});

test('resolveCohortPrice cohort override wins', () => {
  const p = resolveCohortPrice({ price: 50, currency: 'USD' }, course);
  assert.equal(p.price, 50);
});

test('resolveCohortPrice falls back to catalog when no cohort premium', () => {
  const p = resolveCohortPrice({}, { price: 30, currency: 'USD', isPaid: true });
  assert.equal(p.price, 30);
});

test('computeCohortUpgradeDue charges only delta after catalog payment', () => {
  const rate = 25000;
  const catalogPaidVnd = 30 * rate;
  const u = computeCohortUpgradeDue({
    cohortFullPrice: 45,
    cohortCurrency: 'USD',
    creditVnd: catalogPaidVnd,
  });
  assert.equal(u.listPrice, 15);
  assert.equal(u.catalogCredit, 30);
  assert.equal(u.cohortFullPrice, 45);
  assert.equal(u.isCatalogUpgrade, true);
  assert.equal(u.requiresPayment, true);
});

test('computeCohortUpgradeDue zero due when credit covers cohort', () => {
  const u = computeCohortUpgradeDue({
    cohortFullPrice: 30,
    cohortCurrency: 'USD',
    creditVnd: 30 * 25000,
  });
  assert.equal(u.listPrice, 0);
  assert.equal(u.requiresPayment, false);
});
