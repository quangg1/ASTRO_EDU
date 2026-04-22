/**
 * Apply manual, reviewer-approved concept patches.
 * This script NEVER auto-generates missing content.
 *
 * Usage:
 *   node scripts/patch-concepts-manual.js --patch data/concept-manual-patch.json --dry-run
 *   node scripts/patch-concepts-manual.js --patch data/concept-manual-patch.json --apply
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

const apply = process.argv.includes('--apply');
const dryRun = !apply;

function uniq(arr) {
  return [...new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean))];
}

function toStringOrKeep(value, fallback) {
  if (value === undefined) return fallback;
  return String(value || '').trim();
}

function parsePatchFile(raw) {
  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.patches)) return data.patches;
  throw new Error('Invalid patch file. Expected array or { patches: [] }');
}

async function main() {
  const patchArg = getArgValue('--patch', 'data/concept-manual-patch.json');
  const patchPath = path.isAbsolute(patchArg) ? patchArg : path.join(__dirname, '..', patchArg);

  if (!fs.existsSync(patchPath)) {
    throw new Error(`Patch file not found: ${patchPath}`);
  }

  const patches = parsePatchFile(fs.readFileSync(patchPath, 'utf8'));
  await mongoose.connect(uri);

  const concepts = await Concept.find({}).lean();
  const conceptById = new Map(concepts.map((c) => [String(c.id || '').trim(), c]));
  const conceptIdSet = new Set(conceptById.keys());

  const summary = {
    mode: dryRun ? 'dry-run' : 'apply',
    patchPath,
    totalPatches: patches.length,
    applied: 0,
    skipped: 0,
    errors: [],
    updatedIds: [],
  };

  for (let i = 0; i < patches.length; i++) {
    const p = patches[i] || {};
    const id = String(p.id || '').trim();
    if (!id) {
      summary.errors.push({ index: i, reason: 'missing_id' });
      summary.skipped += 1;
      continue;
    }
    const current = conceptById.get(id);
    if (!current) {
      summary.errors.push({ index: i, id, reason: 'concept_not_found' });
      summary.skipped += 1;
      continue;
    }

    const setObj = p.set && typeof p.set === 'object' ? p.set : {};
    const addAliases = uniq(p.addAliases);
    const addRelated = uniq(p.addRelated);
    const addPrerequisites = uniq(p.addPrerequisites);
    const removeAliases = new Set(uniq(p.removeAliases));
    const removeRelated = new Set(uniq(p.removeRelated));
    const removePrerequisites = new Set(uniq(p.removePrerequisites));

    for (const rid of addRelated) {
      if (!conceptIdSet.has(rid)) {
        summary.errors.push({ index: i, id, reason: `related_not_found:${rid}` });
        summary.skipped += 1;
        continue;
      }
    }
    for (const pid of addPrerequisites) {
      if (!conceptIdSet.has(pid)) {
        summary.errors.push({ index: i, id, reason: `prerequisite_not_found:${pid}` });
        summary.skipped += 1;
        continue;
      }
    }

    const next = {
      title: toStringOrKeep(setObj.title, current.title || ''),
      short_description: toStringOrKeep(setObj.short_description, current.short_description || ''),
      explanation: toStringOrKeep(setObj.explanation, current.explanation || ''),
      domain: toStringOrKeep(setObj.domain, current.domain || ''),
      subdomain: toStringOrKeep(setObj.subdomain, current.subdomain || ''),
      published:
        typeof setObj.published === 'boolean'
          ? setObj.published
          : typeof current.published === 'boolean'
            ? current.published
            : true,
      examples: uniq(setObj.examples !== undefined ? setObj.examples : current.examples || []),
      aliases: uniq([...(current.aliases || []), ...addAliases]),
      related: uniq([...(current.related || []), ...addRelated]).filter((x) => x !== id),
      prerequisites: uniq([...(current.prerequisites || []), ...addPrerequisites]).filter((x) => x !== id),
    };

    if (removeAliases.size > 0) next.aliases = next.aliases.filter((x) => !removeAliases.has(x));
    if (removeRelated.size > 0) next.related = next.related.filter((x) => !removeRelated.has(x));
    if (removePrerequisites.size > 0) {
      next.prerequisites = next.prerequisites.filter((x) => !removePrerequisites.has(x));
    }

    const changed =
      next.title !== (current.title || '') ||
      next.short_description !== (current.short_description || '') ||
      next.explanation !== (current.explanation || '') ||
      next.domain !== (current.domain || '') ||
      next.subdomain !== (current.subdomain || '') ||
      next.published !== current.published ||
      JSON.stringify(next.examples) !== JSON.stringify(current.examples || []) ||
      JSON.stringify(next.aliases) !== JSON.stringify(current.aliases || []) ||
      JSON.stringify(next.related) !== JSON.stringify(current.related || []) ||
      JSON.stringify(next.prerequisites) !== JSON.stringify(current.prerequisites || []);

    if (!changed) {
      summary.skipped += 1;
      continue;
    }

    if (apply) {
      await Concept.updateOne(
        { _id: current._id },
        {
          $set: {
            title: next.title,
            short_description: next.short_description,
            explanation: next.explanation,
            domain: next.domain,
            subdomain: next.subdomain,
            examples: next.examples,
            aliases: next.aliases,
            related: next.related,
            prerequisites: next.prerequisites,
            published: next.published,
          },
        },
      );
    }

    summary.applied += 1;
    summary.updatedIds.push(id);
  }

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

