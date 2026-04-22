/**
 * Audit concept quality/state without mutating data.
 *
 * Usage:
 *   node scripts/audit-concepts.js
 *   node scripts/audit-concepts.js --out reports/concept-audit.json
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Concept = require('../features/courses/models/Concept');
const LearningPath = require('../features/courses/models/LearningPath');

const uri = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies';

function getArgValue(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return fallback;
  return process.argv[idx + 1] || fallback;
}

function uniq(arr) {
  return [...new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean))];
}

function isMissing(v) {
  return typeof v !== 'string' || !v.trim();
}

async function main() {
  const outArg = getArgValue('--out', 'reports/concept-audit.json');
  const outPath = path.isAbsolute(outArg) ? outArg : path.join(__dirname, '..', outArg);

  await mongoose.connect(uri);

  const [conceptDocs, lp] = await Promise.all([
    Concept.find({}).lean(),
    LearningPath.findOne({ slug: 'main' }).lean(),
  ]);

  const concepts = conceptDocs || [];
  const conceptIdSet = new Set(concepts.map((c) => String(c.id || '').trim()).filter(Boolean));
  const modules = lp?.modules || [];

  const usageByConcept = new Map(); // conceptId -> [{ moduleId, nodeId, depth, lessonId, via }]
  const anchorCoverageByConcept = new Map(); // conceptId -> { lessonsWithConcept, lessonsWithAnchor }

  for (const mod of modules) {
    for (const node of mod.nodes || []) {
      const depths = node.depths || {};
      for (const depth of ['beginner', 'explorer', 'researcher']) {
        for (const lesson of depths[depth] || []) {
          const lessonId = String(lesson.id || '').trim();
          const mapped = uniq(lesson.conceptIds);
          const anchored = uniq((lesson.conceptAnchors || []).map((a) => a?.conceptId));

          for (const cid of mapped) {
            if (!usageByConcept.has(cid)) usageByConcept.set(cid, []);
            usageByConcept.get(cid).push({
              moduleId: mod.id,
              nodeId: node.id,
              depth,
              lessonId,
              via: 'conceptIds',
            });

            if (!anchorCoverageByConcept.has(cid)) {
              anchorCoverageByConcept.set(cid, { lessonsWithConcept: 0, lessonsWithAnchor: 0 });
            }
            const row = anchorCoverageByConcept.get(cid);
            row.lessonsWithConcept += 1;
            if (anchored.includes(cid)) row.lessonsWithAnchor += 1;
          }

          for (const cid of anchored) {
            if (!usageByConcept.has(cid)) usageByConcept.set(cid, []);
            usageByConcept.get(cid).push({
              moduleId: mod.id,
              nodeId: node.id,
              depth,
              lessonId,
              via: 'conceptAnchors',
            });
          }
        }
      }
    }
  }

  const missingFields = [];
  const invalidPrerequisites = [];
  const invalidRelated = [];
  const duplicateIds = [];
  const seenIds = new Set();
  const noUsage = [];
  const lowAnchorCoverage = [];

  for (const c of concepts) {
    const id = String(c.id || '').trim();
    if (!id) continue;

    if (seenIds.has(id)) duplicateIds.push(id);
    seenIds.add(id);

    const missing = [];
    if (isMissing(c.title)) missing.push('title');
    if (isMissing(c.short_description)) missing.push('short_description');
    if (isMissing(c.explanation)) missing.push('explanation');
    if (isMissing(c.domain)) missing.push('domain');
    if (isMissing(c.subdomain)) missing.push('subdomain');
    if (!Array.isArray(c.aliases) || c.aliases.length === 0) missing.push('aliases');
    if (missing.length > 0) missingFields.push({ id, missing });

    const prereqs = uniq(c.prerequisites);
    for (const pid of prereqs) {
      if (!conceptIdSet.has(pid)) {
        invalidPrerequisites.push({ id, prerequisiteId: pid, reason: 'not_found' });
      } else if (pid === id) {
        invalidPrerequisites.push({ id, prerequisiteId: pid, reason: 'self_reference' });
      }
    }

    const related = uniq(c.related);
    for (const rid of related) {
      if (!conceptIdSet.has(rid)) {
        invalidRelated.push({ id, relatedId: rid, reason: 'not_found' });
      } else if (rid === id) {
        invalidRelated.push({ id, relatedId: rid, reason: 'self_reference' });
      }
    }

    const usageRows = usageByConcept.get(id) || [];
    if (usageRows.length === 0) noUsage.push(id);

    const coverage = anchorCoverageByConcept.get(id);
    if (coverage && coverage.lessonsWithConcept > 0) {
      const ratio = coverage.lessonsWithAnchor / coverage.lessonsWithConcept;
      if (ratio < 0.5) {
        lowAnchorCoverage.push({
          id,
          lessonsWithConcept: coverage.lessonsWithConcept,
          lessonsWithAnchor: coverage.lessonsWithAnchor,
          ratio: Number(ratio.toFixed(2)),
        });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mongoUri: uri,
    totals: {
      concepts: concepts.length,
      missingFields: missingFields.length,
      invalidPrerequisites: invalidPrerequisites.length,
      invalidRelated: invalidRelated.length,
      duplicateIds: duplicateIds.length,
      unusedConcepts: noUsage.length,
      lowAnchorCoverage: lowAnchorCoverage.length,
    },
    issues: {
      missingFields,
      invalidPrerequisites,
      invalidRelated,
      duplicateIds,
      noUsage,
      lowAnchorCoverage,
    },
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({ ok: true, outPath, totals: report.totals }, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

