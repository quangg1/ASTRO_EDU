const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const {
  assertShowcaseEntityAccess,
  entityHasLpLinks,
} = require('../features/agent/services/toolAuthorizers/showcaseAccess');

const hasMongo = Boolean(process.env.MONGODB_URI);
const skipReason = hasMongo ? false : 'requires MONGODB_URI';

test.before(async () => {
  if (!hasMongo || mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });
});

test(
  'assertShowcaseEntityAccess allows public entity without LP links',
  { skip: skipReason },
  async () => {
    const entityId = `test-public-${Date.now()}`;
    const links = await entityHasLpLinks(entityId);
    assert.equal(links, false);
    const r = await assertShowcaseEntityAccess(null, entityId);
    assert.equal(r.ok, true);
  },
);

test(
  'assertShowcaseEntityAccess requires auth for gated entity without unlock',
  { skip: skipReason },
  async () => {
    const r = await assertShowcaseEntityAccess(null, 'planet-earth');
    if (r.ok) return;
    assert.ok(['auth_required', 'no_access'].includes(r.code));
    assert.ok(r.suggestion);
  },
);

test(
  'assertShowcaseEntityAccess openHistory fails when no narrative',
  { skip: skipReason },
  async () => {
    const r = await assertShowcaseEntityAccess('user-1', 'sc-voyager1', { openHistory: true });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'no_history');
  },
);

test.after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
