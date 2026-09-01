#!/usr/bin/env node
// Architecture guard for services/api.
//
// The API is a modular monolith: features own their data, and layers only ever
// point downwards (routes -> controllers -> services -> repositories -> models).
// This script enforces that mechanically so the structure cannot silently rot
// the way it did before the refactor.
//
// Existing debt is frozen in scripts/architecture-baseline.json: current
// offenders are recorded, so today's tree passes while any *new* violation
// fails CI. Baseline entries can only be removed, never added by hand.
//
// Usage:
//   node scripts/check-architecture.mjs                   # fail on new violations
//   node scripts/check-architecture.mjs --report          # list everything, always exit 0
//   node scripts/check-architecture.mjs --update-baseline # re-freeze current debt
//   node scripts/check-architecture.mjs --prune-baseline  # drop entries already fixed

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const API_ROOT = resolve(SCRIPT_DIR, '..');
const FEATURES_ROOT = join(API_ROOT, 'features');
const BASELINE_PATH = join(SCRIPT_DIR, 'architecture-baseline.json');

const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
const SKIP_DIRS = new Set(['node_modules', '.venv', 'test', 'scripts', 'data']);

const toPosix = (p) => p.split(sep).join('/');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (name.endsWith('.js')) yield full;
  }
}

/** `features/courses/routes/cohorts.js` -> `courses`; null outside features/. */
function featureOf(relPath) {
  const match = /^features\/([^/]+)\//.exec(relPath);
  return match ? match[1] : null;
}

/** Resolves a relative require to a repo-relative posix path, or null. */
function resolveRequire(fromFile, request) {
  if (!request.startsWith('.')) return null;
  return toPosix(relative(API_ROOT, resolve(dirname(fromFile), request)));
}

// Layers are matched anywhere under features/ so that nested sub-features
// (e.g. content3d/earth-history/routes) are held to the same rules.
const isRouteLayer = (p) =>
  /^features\/.+\/routes\//.test(p) || /^features\/[^/]+\/index\.js$/.test(p);
const isServiceLayer = (p) => /^features\/.*\/services\//.test(p);
const isModelLayer = (p) => /^features\/.*\/models\//.test(p);
const isDataLayer = (p) => /\/(models|repositories)\//.test(p);

const RULES = [
  {
    id: 'no-cross-feature-models',
    describe: 'A feature must not read another feature\'s Mongoose models directly.',
    fix: "Expose the data through the owning feature's services/ API and import that instead.",
    check: ({ fromRel, targetRel }) => {
      if (!targetRel || !targetRel.includes('/models/')) return false;
      const from = featureOf(fromRel);
      const to = featureOf(targetRel);
      return Boolean(from && to && from !== to);
    },
  },
  {
    id: 'no-cross-feature-repositories',
    describe: 'Repositories are a feature-private data layer.',
    fix: 'Call the owning feature\'s service, not its repository.',
    check: ({ fromRel, targetRel }) => {
      if (!targetRel || !targetRel.includes('/repositories/')) return false;
      const from = featureOf(fromRel);
      const to = featureOf(targetRel);
      return Boolean(from && to && from !== to);
    },
  },
  {
    id: 'no-data-access-in-routes',
    describe: 'Route files must stay declarative — no models or repositories.',
    fix: 'Move the query into a service and call it from a controller.',
    check: ({ fromRel, targetRel }) =>
      isRouteLayer(fromRel) && Boolean(targetRel) && isDataLayer(targetRel),
  },
  {
    id: 'no-express-in-services',
    describe: 'Services must not depend on the HTTP framework.',
    fix: 'Keep req/res handling in the controller; pass plain values into the service.',
    check: ({ fromRel, request }) => isServiceLayer(fromRel) && request === 'express',
  },
  {
    id: 'no-services-in-models',
    describe: 'Models sit at the bottom of the graph; importing services creates cycles.',
    fix: 'Move the behaviour into a service that depends on the model.',
    check: ({ fromRel, targetRel }) =>
      isModelLayer(fromRel) && Boolean(targetRel) && targetRel.includes('/services/'),
  },
];

function collectViolations() {
  const violations = [];
  if (!existsSync(FEATURES_ROOT)) return violations;

  for (const abs of walk(FEATURES_ROOT)) {
    const fromRel = toPosix(relative(API_ROOT, abs));
    const source = readFileSync(abs, 'utf8');

    // A file-level opt-out documents an intentional exception (e.g. the admin
    // reporting read model) instead of silently weakening the rule.
    if (source.includes('eslint-disable no-restricted-imports')) continue;

    REQUIRE_RE.lastIndex = 0;
    let match;
    while ((match = REQUIRE_RE.exec(source)) !== null) {
      const request = match[1];
      const targetRel = resolveRequire(abs, request);
      const line = source.slice(0, match.index).split('\n').length;

      for (const rule of RULES) {
        if (rule.check({ fromRel, targetRel, request })) {
          violations.push({ rule: rule.id, file: fromRel, line, import: request });
        }
      }
    }
  }
  return violations;
}

/** Baseline is keyed by `rule|file` so moving a line does not break the build. */
const keyOf = (v) => `${v.rule}|${v.file}`;

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return new Set();
  return new Set(JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).entries || []);
}

function summarise(violations) {
  const byRule = new Map();
  for (const v of violations) byRule.set(v.rule, (byRule.get(v.rule) || 0) + 1);
  return byRule;
}

function writeBaseline(entries) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        note: 'Frozen architecture debt. Entries may be removed as code is refactored, never added by hand.',
        generatedFrom: 'node scripts/check-architecture.mjs --update-baseline',
        entries,
      },
      null,
      2,
    )}\n`,
  );
}

const violations = collectViolations();
const args = new Set(process.argv.slice(2));

if (args.has('--update-baseline')) {
  const entries = [...new Set(violations.map(keyOf))].sort();
  writeBaseline(entries);
  console.log(`Baseline updated: ${entries.length} file/rule pairs frozen.`);
  process.exit(0);
}

// Ratchet chỉ siết được nếu nợ đã trả cũng biến khỏi baseline; lệnh này chỉ xóa,
// không bao giờ thêm, nên không thể dùng để giấu vi phạm mới.
if (args.has('--prune-baseline')) {
  const live = new Set(violations.map(keyOf));
  const previous = [...loadBaseline()];
  const entries = previous.filter((entry) => live.has(entry)).sort();
  writeBaseline(entries);
  console.log(`Baseline pruned: ${previous.length - entries.length} fixed entries removed, ${entries.length} left.`);
  process.exit(0);
}

const baseline = loadBaseline();
const fresh = violations.filter((v) => !baseline.has(keyOf(v)));

if (args.has('--report')) {
  console.log(`Architecture report — ${violations.length} total violations\n`);
  for (const [rule, count] of summarise(violations)) {
    const frozen = violations.filter((v) => v.rule === rule && baseline.has(keyOf(v))).length;
    console.log(`  ${rule}: ${count} (${frozen} frozen, ${count - frozen} new)`);
  }
  for (const v of fresh) console.log(`\n  NEW ${v.rule}  ${v.file}:${v.line}  ${v.import}`);
  process.exit(0);
}

if (fresh.length === 0) {
  console.log(
    `OK — architecture clean (${baseline.size} frozen debt entries, 0 new violations).`,
  );
  process.exit(0);
}

console.error(`Architecture violation: ${fresh.length} new import(s) break the layering.\n`);
for (const rule of RULES) {
  const hits = fresh.filter((v) => v.rule === rule.id);
  if (!hits.length) continue;
  console.error(`${rule.id} — ${rule.describe}`);
  for (const hit of hits) console.error(`  ${hit.file}:${hit.line}  ${hit.import}`);
  console.error(`  Fix: ${rule.fix}\n`);
}
console.error(
  'If this is a deliberate, documented exception, add a file-level ' +
    '`/* eslint-disable no-restricted-imports -- reason */` comment explaining why.',
);
process.exit(1);
