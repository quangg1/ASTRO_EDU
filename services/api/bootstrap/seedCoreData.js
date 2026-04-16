const fs = require('fs');
const path = require('path');
const LearningPath = require('../features/courses/models/LearningPath');
const Concept = require('../features/courses/models/Concept');
const TaxonomyRegistry = require('../features/courses/models/TaxonomyRegistry');

const DEFAULT_TAXONOMY = {
  astronomy: [
    'fundamentals',
    'orbital-mechanics',
    'stellar-physics',
    'galactic-cosmology',
    'observational-astronomy',
    'positional-astronomy',
  ],
  geology: ['tectonics', 'volcanology', 'stratigraphy', 'planetary-geology'],
  biology: ['evolution', 'ecology', 'paleontology'],
  physics: ['mechanics', 'thermodynamics', 'electromagnetism'],
  chemistry: ['astrochemistry', 'geochemistry', 'atmospheric-chemistry'],
};

function readLearningPathSeed() {
  const filePath = path.join(__dirname, '../data/learningPathDefault.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeConcepts(concepts) {
  if (!Array.isArray(concepts)) return [];
  const base = concepts
    .map((c) => ({
      id: String(c.id || '').trim(),
      title: String(c.title || c.label || c.labelVi || '').trim(),
      short_description: String(c.short_description || '').trim(),
      explanation: String(c.explanation || c.definition || c.definitionVi || '').trim(),
      examples: Array.isArray(c.examples)
        ? [...new Set(c.examples.map((x) => String(x || '').trim()).filter(Boolean))]
        : [],
      related: Array.isArray(c.related)
        ? [...new Set(c.related.map((x) => String(x || '').trim()).filter(Boolean))]
        : [],
      domain: String(c.domain || '').trim(),
      subdomain: String(c.subdomain || '').trim(),
      aliases: Array.isArray(c.aliases)
        ? [...new Set(c.aliases.map((x) => String(x || '').trim()).filter(Boolean))]
        : [],
      prerequisites: Array.isArray(c.prerequisites)
        ? [...new Set(c.prerequisites.map((x) => String(x || '').trim()).filter(Boolean))]
        : [],
      published: c.published !== false,
    }))
    .filter((c) => c.id);

  const idSet = new Set(base.map((c) => c.id));
  return base.map((c) => ({
    ...c,
    title: c.title || c.id,
    related: c.related.filter((rid) => rid !== c.id && idSet.has(rid)),
    prerequisites: c.prerequisites.filter((pid) => pid !== c.id && idSet.has(pid)),
  }));
}

async function bootstrapCoreData() {
  const seed = readLearningPathSeed();

  const existingPath = await LearningPath.findOne({ slug: 'main' }).lean();
  if (!existingPath) {
    await LearningPath.create({
      slug: 'main',
      published: true,
      modules: Array.isArray(seed?.modules) ? seed.modules : [],
      concepts: Array.isArray(seed?.concepts) ? seed.concepts : [],
    });
  }

  const conceptCount = await Concept.countDocuments();
  if (conceptCount === 0 && Array.isArray(seed?.concepts) && seed.concepts.length > 0) {
    await Concept.insertMany(normalizeConcepts(seed.concepts), { ordered: false }).catch(() => {});
  }

  const existingTaxonomy = await TaxonomyRegistry.findOne({ key: 'default' }).lean();
  if (!existingTaxonomy || !existingTaxonomy.taxonomy || Object.keys(existingTaxonomy.taxonomy).length === 0) {
    await TaxonomyRegistry.updateOne(
      { key: 'default' },
      { $set: { taxonomy: DEFAULT_TAXONOMY } },
      { upsert: true }
    );
  }
}

module.exports = { bootstrapCoreData };
