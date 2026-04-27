const fs = require('fs');
const path = require('path');
const LearningPath = require('../features/courses/models/LearningPath');
const Concept = require('../features/courses/models/Concept');
const TaxonomyRegistry = require('../features/courses/models/TaxonomyRegistry');
const ShowcaseCatalogBundle = require('../features/courses/models/ShowcaseCatalogBundle');
const ShowcaseEntityContent = require('../features/courses/models/ShowcaseEntityContent');
const HORIZONS_ID_BY_ENTITY = {
  'planet-mercury': '199',
  'planet-venus': '299',
  'planet-earth': '399',
  'planet-mars': '499',
  'planet-jupiter': '599',
  'planet-saturn': '699',
  'planet-uranus': '799',
  'planet-neptune': '899',
  'moon-luna': '301',
  'moon-phobos': '401',
  'moon-deimos': '402',
  'moon-io': '501',
  'moon-europa': '502',
  'moon-ganymede': '503',
  'moon-callisto': '504',
  'moon-mimas': '601',
  'moon-enceladus': '602',
  'moon-tethys': '603',
  'moon-dione': '604',
  'moon-rhea': '605',
  'moon-titan': '606',
  'moon-iapetus': '608',
  'moon-miranda': '705',
  'moon-ariel': '701',
  'moon-umbriel': '702',
  'moon-titania': '703',
  'moon-oberon': '704',
  'moon-triton': '801',
  'dwarf-pluto': '999',
  'moon-charon': '901',
  'dwarf-ceres': '1',
  'dwarf-eris': '136199',
  'dwarf-haumea': '136108',
  'dwarf-makemake': '136472',
  'asteroid-bennu': '101955',
  'asteroid-psyche': '16',
  'comet-halley': '1P',
  'comet-tempel1': '9P',
  'comet-67p': '67P',
  'comet-halebopp': 'C/1995 O1',
  'comet-encke': '2P',
};
const PLANET_ID_BY_NAME = {
  Mercury: 'planet-mercury',
  Venus: 'planet-venus',
  Earth: 'planet-earth',
  Mars: 'planet-mars',
  Jupiter: 'planet-jupiter',
  Saturn: 'planet-saturn',
  Uranus: 'planet-uranus',
  Neptune: 'planet-neptune',
};

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

function readShowcaseCatalogSeed() {
  const filePath = path.join(__dirname, '..', '..', '..', 'client', 'src', 'data', 'showcaseCatalogBundle.json');
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

function enrichOrbitRelations(orbits) {
  if (!Array.isArray(orbits)) return [];
  const byId = new Map(orbits.map((o) => [String(o?.id || '').trim(), o]));
  return orbits.map((o) => {
    const id = String(o?.id || '').trim();
    const horizonsId = String(o?.horizonsId || HORIZONS_ID_BY_ENTITY[id] || '').trim();
    let parentId = String(o?.parentId || '').trim();
    if (!parentId) {
      const byPlanet = String(o?.parentPlanetName || '').trim();
      if (byPlanet && PLANET_ID_BY_NAME[byPlanet]) parentId = PLANET_ID_BY_NAME[byPlanet];
      if (!parentId && o?.parentShowcaseEntityId) parentId = String(o.parentShowcaseEntityId);
    }
    const parent = parentId ? byId.get(parentId) : null;
    const parentHorizons = String(parent?.horizonsId || HORIZONS_ID_BY_ENTITY[parentId] || '').trim();
    const orbitAround = String(o?.orbitAround || o?.horizonsCenter || '').trim() || (parentHorizons ? `500@${parentHorizons}` : '500@10');
    return {
      ...o,
      horizonsId,
      parentId,
      orbitAround,
      horizonsCommand: String(o?.horizonsCommand || horizonsId || '').trim(),
      horizonsCenter: String(o?.horizonsCenter || orbitAround || '').trim(),
    };
  });
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

  const bundleDoc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
  const hasBundle =
    bundleDoc &&
    Array.isArray(bundleDoc.catalog) &&
    bundleDoc.catalog.length > 0 &&
    Array.isArray(bundleDoc.orbits) &&
    bundleDoc.orbits.length > 0;
  if (!hasBundle) {
    const sc = readShowcaseCatalogSeed();
    const catalog = Array.isArray(sc?.catalog) ? sc.catalog : [];
    const orbits = Array.isArray(sc?.orbits) ? sc.orbits : [];
    const stories = Array.isArray(sc?.stories) ? sc.stories : [];
    if (catalog.length > 0 && orbits.length > 0) {
      await ShowcaseCatalogBundle.updateOne(
        { slug: 'main' },
        { $set: { slug: 'main', catalog, orbits, stories } },
        { upsert: true }
      );
    }
  }

  // One-time migration path: merge legacy showcaseentitycontents into unified bundle.catalog.
  const freshBundle = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
  const legacyRows = await ShowcaseEntityContent.find({}).lean();
  if (freshBundle && Array.isArray(freshBundle.catalog) && freshBundle.catalog.length > 0 && legacyRows.length > 0) {
    const byId = new Map(
      legacyRows
        .map((r) => [String(r.entityId || '').trim(), r])
        .filter(([id]) => id),
    );
    const nextCatalog = freshBundle.catalog.map((entry) => {
      const id = String(entry?.id || '').trim();
      const legacy = byId.get(id);
      if (!legacy) return entry;
      const diffuse = String(legacy.diffuseMapUrl || legacy.textureUrl || '').trim();
      return {
        ...entry,
        nameVi: String(legacy.nameVi || '').trim(),
        museumBlurbVi: String(legacy.museumBlurbVi || '').trim(),
        textureUrl: diffuse,
        diffuseMapUrl: diffuse,
        normalMapUrl: String(legacy.normalMapUrl || '').trim(),
        specularMapUrl: String(legacy.specularMapUrl || '').trim(),
        cloudMapUrl: String(legacy.cloudMapUrl || '').trim(),
        modelUrl: String(legacy.modelUrl || '').trim(),
        published: legacy.published !== false,
      };
    });
    await ShowcaseCatalogBundle.updateOne(
      { slug: 'main' },
      { $set: { catalog: nextCatalog } },
      { upsert: true },
    );
  }

  // Legacy cleanup: collection cũ không còn là source-of-truth.
  try {
    const collections = await ShowcaseEntityContent.db.db.listCollections({ name: 'showcaseentitycontents' }).toArray();
    if (collections.length > 0) {
      await ShowcaseEntityContent.collection.drop();
    }
  } catch {
    // ignore if already dropped or insufficient permission
  }

  // Ensure hierarchical relation + JPL ids exist in unified bundle.
  const after = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
  if (after && Array.isArray(after.orbits) && after.orbits.length > 0) {
    const nextOrbits = enrichOrbitRelations(after.orbits);
    if (JSON.stringify(nextOrbits) !== JSON.stringify(after.orbits)) {
      const nextCatalog = (Array.isArray(after.catalog) ? after.catalog : []).map((c) => {
        const id = String(c?.id || '').trim();
        const linked = nextOrbits.find((o) => String(o?.id || '').trim() === id);
        if (!linked) return c;
        return {
          ...c,
          horizonsId: linked.horizonsId || c.horizonsId || '',
          parentId: linked.parentId || c.parentId || '',
          orbitAround: linked.orbitAround || c.orbitAround || '',
          horizonsCommand: linked.horizonsCommand || c.horizonsCommand || '',
          horizonsCenter: linked.horizonsCenter || c.horizonsCenter || '',
        };
      });
      await ShowcaseCatalogBundle.updateOne(
        { slug: 'main' },
        { $set: { orbits: nextOrbits, catalog: nextCatalog } },
        { upsert: true },
      );
    }
  }
}

module.exports = { bootstrapCoreData };
