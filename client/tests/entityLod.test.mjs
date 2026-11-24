import assert from 'node:assert/strict'
import { test } from 'node:test'
const m = await import(process.env.LOD_MOD || new URL('../.tmp/entityLod.mjs', import.meta.url).href)
const { screenRadiusPx, desiredTier, assignLod, DEFAULT_LOD_BUDGETS } = m
test('screen radius shrinks with distance', () => {
  const near = screenRadiusPx(1, 10, 45, 800), far = screenRadiusPx(1, 100, 45, 800)
  assert.ok(Math.abs(near / far - 10) < 1e-9)
  assert.ok(near > 90 && near < 100)
})
test('hysteresis avoids flicker', () => {
  assert.equal(desiredTier(2.5, 'point', false), 'point')
  assert.equal(desiredTier(2.5, 'globe', false), 'globe')
  assert.equal(desiredTier(25, 'globe', true), 'globe')
  assert.equal(desiredTier(25, 'model', true), 'model')
  assert.equal(desiredTier(100, undefined, false), 'globe')
})
test('budgets cap models, globes and labels; active always shown', () => {
  const c = Array.from({ length: 5000 }, (_, i) => ({ id: 'e' + i, px: 200 - i * 0.03, hasModel: true }))
  c.push({ id: 'act', px: 0.1, hasModel: true, active: true })
  const r = assignLod(c, new Map())
  const count = (t) => [...r.tiers.values()].filter((x) => x === t).length
  assert.equal(count('model'), DEFAULT_LOD_BUDGETS.modelBudget)
  assert.ok(count('globe') <= DEFAULT_LOD_BUDGETS.globeBudget + 1)
  assert.equal(r.tiers.get('act'), 'model')
  assert.ok(r.labels.has('act'))
  assert.ok(r.labels.size <= DEFAULT_LOD_BUDGETS.labelBudget + 1)
  assert.equal(count('point') + count('globe') + count('model'), 5001)
})
test('offscreen entities cost nothing', () => {
  const r = assignLod([{ id: 'a', px: 500, hasModel: true, offscreen: true }], new Map())
  assert.equal(r.tiers.get('a'), 'point'); assert.equal(r.labels.size, 0)
})
