const test = require('node:test');
const assert = require('node:assert/strict');
const schema = require('../features/courses/schemas/cohortSchemas');

test('createCohortBody applies defaults and normalises pricing', () => {
  const parsed = schema.createCohortBody.parse({ title: '  Lớp K1  ' });

  assert.equal(parsed.title, 'Lớp K1');
  assert.equal(parsed.timezone, 'Asia/Ho_Chi_Minh');
  assert.equal(parsed.status, 'draft');
  assert.equal(parsed.startAt, null);
  assert.equal(parsed.price, null);
  assert.equal(parsed.currency, null);
});

test('createCohortBody rounds price and drops unsupported currency', () => {
  const parsed = schema.createCohortBody.parse({ price: '199000.6', currency: 'EUR' });

  assert.equal(parsed.price, 199001);
  assert.equal(parsed.currency, null);
});

test('createCohortBody clamps negative price to zero', () => {
  assert.equal(schema.createCohortBody.parse({ price: -50 }).price, 0);
});

test('updateCohortBody keeps absent keys undefined so partial updates are safe', () => {
  const parsed = schema.updateCohortBody.parse({ title: 'Lớp K2' });

  assert.equal(parsed.title, 'Lớp K2');
  assert.equal('startAt' in parsed, false);
  assert.equal('price' in parsed, false);
});

test('updateCohortBody treats empty string as an explicit clear', () => {
  const parsed = schema.updateCohortBody.parse({ startAt: '', price: '' });

  assert.equal(parsed.startAt, null);
  assert.equal(parsed.price, null);
});

test('updateCohortBody rejects an unparseable date', () => {
  assert.equal(schema.updateCohortBody.safeParse({ startAt: 'hôm qua' }).success, false);
});

test('cohortParams rejects a non-ObjectId cohort id', () => {
  const result = schema.cohortParams.safeParse({ slug: 'thien-van', cohortId: '123' });
  assert.equal(result.success, false);
});

test('submissionsQuery defaults to submitted', () => {
  assert.equal(schema.submissionsQuery.parse({}).status, 'submitted');
});

test('saveSchedulesBody defaults to an empty grid and requires lessonSlug', () => {
  assert.deepEqual(schema.saveSchedulesBody.parse({}).schedules, []);
  assert.equal(
    schema.saveSchedulesBody.safeParse({ schedules: [{ openAtLocal: '2026-01-01T08:00' }] }).success,
    false,
  );
});
