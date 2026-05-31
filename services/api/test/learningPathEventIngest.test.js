const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const {
  normalizeLearningPathEvent,
  ALLOWED_EVENT_NAMES,
} = require('../features/learning-path/lib/normalizeLearningPathEvent');
const { ingestLearningPathEvents } = require('../features/learning-path/services/learningPathEventIngest');

test('ALLOWED_EVENT_NAMES includes deep_history events', () => {
  assert.ok(ALLOWED_EVENT_NAMES.has('deep_history_beat_dwell'));
  assert.ok(ALLOWED_EVENT_NAMES.has('deep_history_site_opened'));
});

test('normalizeLearningPathEvent accepts deep_history_beat_dwell', () => {
  const row = normalizeLearningPathEvent(
    {
      eventName: 'deep_history_beat_dwell',
      sessionId: 'sess-1',
      metadata: { beatId: 'beat-a' },
      durationSec: 12,
    },
    null,
  );
  assert.ok(row);
  assert.equal(row.eventName, 'deep_history_beat_dwell');
  assert.equal(row.schemaVersion, 1);
  assert.ok(row.eventId);
});

test('normalizeLearningPathEvent preserves client eventId and anonSessionId', () => {
  const row = normalizeLearningPathEvent(
    {
      eventId: 'evt-fixed-1',
      schemaVersion: 1,
      anonSessionId: 'anon-abc',
      eventName: 'scene_entity_clicked',
      sessionId: 'sess-2',
      metadata: { entityId: 'earth' },
    },
    'user-1',
  );
  assert.equal(row.eventId, 'evt-fixed-1');
  assert.equal(row.anonSessionId, 'anon-abc');
  assert.equal(row.userId, 'user-1');
});

test('normalizeLearningPathEvent rejects unknown event names', () => {
  assert.equal(
    normalizeLearningPathEvent({ eventName: 'unknown_event', sessionId: 's' }, null),
    null,
  );
});

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
  'ingestLearningPathEvents is idempotent on eventId',
  { skip: skipReason },
  async () => {
    const eventId = `test-ingest-${Date.now()}`;
    const raw = {
      eventId,
      schemaVersion: 1,
      eventName: 'lp_module_viewed',
      sessionId: `sess-${Date.now()}`,
      moduleId: 'mod-test',
    };

    const first = await ingestLearningPathEvents([raw], null);
    assert.equal(first.inserted.length, 1);
    assert.equal(first.normalized.length, 1);

    const second = await ingestLearningPathEvents([raw], null);
    assert.equal(second.inserted.length, 0);
    assert.equal(second.normalized.length, 1);
  },
);

test.after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
