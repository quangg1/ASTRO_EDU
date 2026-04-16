const test = require('node:test');
const assert = require('node:assert/strict');
const { validateApiEnv } = require('../config/env');

test('validateApiEnv throws when required env is missing', () => {
  const original = {
    MONGODB_URI: process.env.MONGODB_URI,
    CLIENT_URL: process.env.CLIENT_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
  };

  delete process.env.MONGODB_URI;
  process.env.CLIENT_URL = 'http://localhost:3000';
  process.env.JWT_SECRET = 'secret';
  process.env.INTERNAL_API_SECRET = 'internal';

  assert.throws(() => validateApiEnv(), /MONGODB_URI/);

  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
