/**
 * Fill only missing aliases for concepts.
 * Safe rule: derive aliases from existing id/title, no fabricated prerequisites/content.
 *
 * Usage:
 *   node scripts/fill-missing-concept-aliases.js --dry-run
 *   node scripts/fill-missing-concept-aliases.js --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Concept = require('../features/courses/models/Concept');

const uri = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies';
const apply = process.argv.includes('--apply');

function uniq(arr) {
  return [...new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean))];
}

function buildAliases(id, title) {
  const sid = String(id || '').trim();
  const stitle = String(title || '').trim().toLowerCase();
  const kebab = sid.replace(/_/g, '-');
  const snake = sid.replace(/-/g, '_');
  const spaced = sid.replace(/[_-]+/g, ' ').trim();
  return uniq([sid, kebab, snake, spaced, stitle]);
}

async function main() {
  await mongoose.connect(uri);
  const docs = await Concept.find({}).lean();

  let updated = 0;
  const samples = [];
  const ops = [];

  for (const doc of docs) {
    const currentAliases = Array.isArray(doc.aliases) ? uniq(doc.aliases) : [];
    if (currentAliases.length > 0) continue;

    const nextAliases = buildAliases(doc.id, doc.title);
    if (nextAliases.length === 0) continue;

    if (apply) ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { aliases: nextAliases } } } });
    updated += 1;
    if (samples.length < 12) samples.push({ id: doc.id, aliases: nextAliases });
  }

  if (apply && ops.length > 0) {
    await Concept.bulkWrite(ops, { ordered: false });
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        total: docs.length,
        updatedMissingAliases: updated,
        sample: samples,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

