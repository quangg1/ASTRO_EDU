/**
 * Batch sinh pool quiz Explore bằng AI (không chạy trên user focus).
 *
 *   node scripts/generate-explore-contextual-questions.js --dry-run
 *   node scripts/generate-explore-contextual-questions.js --apply
 *   node scripts/generate-explore-contextual-questions.js --apply --entity-id planet-mars
 *   node scripts/generate-explore-contextual-questions.js --apply --limit 5 --sleep-ms 4000
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ExploreContextualQuestionPool = require('../features/content3d/models/ExploreContextualQuestionPool');
const ShowcaseCatalogBundleModel = require('../features/content3d/models/ShowcaseCatalogBundle');
const {
  generateExploreContextualQuizPool,
  ensureTemplatePool,
  AI_COOLDOWN_MS,
  AI_POOL_FULL_COUNT,
} = require('../features/content3d/services/exploreContextualQuizService');

const apply = process.argv.includes('--apply');
const dryRun = !apply;
const entityArgIdx = process.argv.indexOf('--entity-id');
const entityFilter = entityArgIdx >= 0 ? String(process.argv[entityArgIdx + 1] || '').trim() : '';
const limitArgIdx = process.argv.indexOf('--limit');
const limitN = limitArgIdx >= 0 ? Number(process.argv[limitArgIdx + 1]) : NaN;
const maxEntities = Number.isFinite(limitN) && limitN > 0 ? Math.floor(limitN) : Infinity;
const sleepArgIdx = process.argv.indexOf('--sleep-ms');
const sleepMs = sleepArgIdx >= 0 ? Number(process.argv[sleepArgIdx + 1]) : 3500;
const force = process.argv.includes('--force');

const uri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/galaxies';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function listTargetEntityIds() {
  const bundle = await ShowcaseCatalogBundleModel.findOne({ slug: 'main' }).lean();
  const catalog = bundle?.catalog || [];
  let ids = catalog
    .filter((c) => c && c.published !== false)
    .map((c) => String(c?.id || '').trim())
    .filter(Boolean);
  if (entityFilter) ids = ids.filter((id) => id === entityFilter);
  return ids.slice(0, maxEntities);
}

async function shouldGenerate(entityId) {
  const pool = await ExploreContextualQuestionPool.findOne({ entityId }).lean();
  if (!pool) return { yes: true, reason: 'no_pool' };
  const nonTpl = (pool.questions || []).filter((q) => !String(q?.id || '').includes('explore_tpl')).length;
  if (!force && nonTpl >= AI_POOL_FULL_COUNT) return { yes: false, reason: 'pool_full' };
  if (!force && pool.lastAiAttemptAt) {
    const elapsed = Date.now() - new Date(pool.lastAiAttemptAt).getTime();
    if (elapsed < AI_COOLDOWN_MS) return { yes: false, reason: 'cooldown' };
  }
  return { yes: true, reason: nonTpl ? 'top_up' : 'empty_ai' };
}

async function main() {
  await mongoose.connect(uri);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'} | force=${force} | sleep=${sleepMs}ms`);

  const entityIds = await listTargetEntityIds();
  console.log(`Entities in scope: ${entityIds.length}`);

  let generated = 0;
  let skipped = 0;

  for (const entityId of entityIds) {
    const gate = await shouldGenerate(entityId);
    if (!gate.yes) {
      skipped += 1;
      console.log(`SKIP ${entityId} (${gate.reason})`);
      continue;
    }

    if (dryRun) {
      console.log(`WOULD AI-GENERATE ${entityId}`);
      generated += 1;
      continue;
    }

    await ensureTemplatePool(entityId);
    const result = await generateExploreContextualQuizPool(entityId, { force });
    if (result.ok) {
      generated += 1;
      console.log(`OK ${entityId} provider=${result.provider} poolSize=${result.poolSize}`);
    } else {
      skipped += 1;
      console.log(`FAIL ${entityId} ${result.code}: ${result.error}`);
    }

    if (sleepMs > 0) await sleep(sleepMs);
  }

  console.log(`Done. generated=${generated} skipped=${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
