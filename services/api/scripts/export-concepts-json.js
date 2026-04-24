/**
 * Export concepts to JSON file for Colab upload.
 *
 * Usage:
 *   node scripts/export-concepts-json.js
 *   node scripts/export-concepts-json.js --out data/concepts.json
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Concept = require('../features/courses/models/Concept');

const uri = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies';

function getArgValue(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return fallback;
  return process.argv[idx + 1] || fallback;
}

function uniq(arr) {
  return [...new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean))];
}

async function main() {
  const outArg = getArgValue('--out', 'data/concepts.json');
  const outPath = path.isAbsolute(outArg) ? outArg : path.join(__dirname, '..', outArg);

  await mongoose.connect(uri);
  const docs = await Concept.find({})
    .select('id title short_description explanation aliases domain subdomain prerequisites related examples published')
    .lean();

  const concepts = (docs || [])
    .map((d) => ({
      id: String(d.id || '').trim(),
      title: String(d.title || '').trim(),
      short_description: String(d.short_description || '').trim(),
      explanation: String(d.explanation || '').trim(),
      aliases: uniq(d.aliases),
      domain: String(d.domain || '').trim(),
      subdomain: String(d.subdomain || '').trim(),
      prerequisites: uniq(d.prerequisites),
      related: uniq(d.related),
      examples: uniq(d.examples),
      published: typeof d.published === 'boolean' ? d.published : true,
    }))
    .filter((c) => c.id);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(concepts, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        outPath,
        total: concepts.length,
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

