/**
 * Một lần: gán topicWeights cho mọi node trong learningPathDefault.json
 * Chạy: node scripts/patch-learning-path-topic-weights.js (từ thư mục services/api)
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../data/learningPathDefault.json');

/** @type {Record<string, { topicId: string; weight: number }[]>} key = moduleId/nodeId */
const MAP = {
  'intro-scale/astronomy-what-is': [
    { topicId: 'astrophysics', weight: 0.55 },
    { topicId: 'stargazing', weight: 0.25 },
  ],
  'intro-scale/universe-scale': [
    { topicId: 'astrophysics', weight: 0.65 },
    { topicId: 'solar-system', weight: 0.25 },
  ],
  'intro-scale/hierarchical-structure': [
    { topicId: 'galaxies-nebulae', weight: 0.55 },
    { topicId: 'astrophysics', weight: 0.45 },
  ],

  'sky-motion/day-night': [
    { topicId: 'stargazing', weight: 0.95 },
    { topicId: 'solar-system', weight: 0.35 },
  ],
  'sky-motion/moon-phases': [
    { topicId: 'solar-system', weight: 0.75 },
    { topicId: 'stargazing', weight: 0.5 },
  ],
  'sky-motion/eclipses': [
    { topicId: 'solar-system', weight: 0.7 },
    { topicId: 'stargazing', weight: 0.45 },
  ],
  'sky-motion/coordinate-systems': [{ topicId: 'stargazing', weight: 0.95 }],
  'sky-motion/astronomical-time': [
    { topicId: 'stargazing', weight: 0.88 },
    { topicId: 'astrophysics', weight: 0.22 },
  ],

  'light-observation/what-is-light': [
    { topicId: 'astrophysics', weight: 0.82 },
    { topicId: 'telescopes', weight: 0.32 },
  ],
  'light-observation/spectrum': [
    { topicId: 'astrophysics', weight: 0.92 },
    { topicId: 'telescopes', weight: 0.35 },
  ],
  'light-observation/doppler': [
    { topicId: 'astrophysics', weight: 0.55 },
    { topicId: 'exoplanets', weight: 0.45 },
  ],
  'light-observation/telescopes': [
    { topicId: 'telescopes', weight: 1 },
    { topicId: 'stargazing', weight: 0.38 },
  ],
  'light-observation/multi-wavelength': [
    { topicId: 'telescopes', weight: 0.9 },
    { topicId: 'galaxies-nebulae', weight: 0.48 },
  ],

  'solar-system/the-sun': [
    { topicId: 'solar-system', weight: 1 },
    { topicId: 'stars-constellations', weight: 0.28 },
  ],
  'solar-system/planets': [{ topicId: 'solar-system', weight: 1 }],
  'solar-system/orbits': [
    { topicId: 'solar-system', weight: 0.95 },
    { topicId: 'astrophysics', weight: 0.42 },
  ],
  'solar-system/small-bodies': [
    { topicId: 'solar-system', weight: 0.55 },
    { topicId: 'space-exploration', weight: 0.72 },
  ],
  'solar-system/solar-system-formation': [
    { topicId: 'solar-system', weight: 0.88 },
    { topicId: 'astrophysics', weight: 0.38 },
  ],

  'stars-evolution/what-is-a-star': [
    { topicId: 'stars-constellations', weight: 0.92 },
    { topicId: 'astrophysics', weight: 0.42 },
  ],
  'stars-evolution/stellar-energy': [
    { topicId: 'stars-constellations', weight: 0.88 },
    { topicId: 'astrophysics', weight: 0.58 },
  ],
  'stars-evolution/hr-diagram': [
    { topicId: 'stars-constellations', weight: 0.92 },
    { topicId: 'astrophysics', weight: 0.42 },
  ],
  'stars-evolution/stellar-lifecycle': [{ topicId: 'stars-constellations', weight: 0.96 }],
  'stars-evolution/stellar-remnants': [
    { topicId: 'stars-constellations', weight: 0.78 },
    { topicId: 'astrophysics', weight: 0.52 },
  ],

  'universe-cosmology/galaxies': [
    { topicId: 'galaxies-nebulae', weight: 1 },
    { topicId: 'astrophysics', weight: 0.42 },
  ],
  'universe-cosmology/big-bang': [
    { topicId: 'galaxies-nebulae', weight: 0.52 },
    { topicId: 'astrophysics', weight: 0.92 },
  ],
  'universe-cosmology/expansion': [
    { topicId: 'galaxies-nebulae', weight: 0.48 },
    { topicId: 'astrophysics', weight: 0.88 },
  ],
  'universe-cosmology/dark-matter': [
    { topicId: 'astrophysics', weight: 0.92 },
    { topicId: 'galaxies-nebulae', weight: 0.52 },
  ],
  'universe-cosmology/dark-energy': [
    { topicId: 'astrophysics', weight: 0.95 },
    { topicId: 'galaxies-nebulae', weight: 0.45 },
  ],
  'universe-cosmology/fate-of-universe': [
    { topicId: 'astrophysics', weight: 0.9 },
    { topicId: 'galaxies-nebulae', weight: 0.52 },
  ],
};

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
let n = 0;
for (const mod of data.modules) {
  for (const node of mod.nodes) {
    const key = `${mod.id}/${node.id}`;
    const tw = MAP[key];
    if (tw) {
      node.topicWeights = tw;
      n += 1;
    }
  }
}
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log(`Patched topicWeights on ${n} nodes → ${file}`);
