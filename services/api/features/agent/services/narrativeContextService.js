const PlanetNarrative = require('../../content3d/planet-narrative/models/PlanetNarrative');

function pickBeat(beats, stageTimeMa) {
  const list = Array.isArray(beats) ? beats : [];
  if (!list.length) return null;
  const ma = Number(stageTimeMa);
  if (Number.isNaN(ma)) return list[0];
  let best = list[0];
  let bestDist = Infinity;
  for (const b of list) {
    const t = Number(b?.timeMa ?? b?.stageTimeMa ?? b?.ma);
    if (Number.isNaN(t)) continue;
    const d = Math.abs(t - ma);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

function excerpt(text, max = 320) {
  const s = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/**
 * @param {{ planet?: string|null, entityId?: string|null, stageTimeMa?: number|null, narrativeKey?: string|null }} sessionContext
 */
async function buildNarrativeContext(sessionContext = {}) {
  const entityId =
    (typeof sessionContext.entityId === 'string' && sessionContext.entityId.trim()) ||
    (typeof sessionContext.narrativeKey === 'string' && sessionContext.narrativeKey.startsWith('planet:')
      ? sessionContext.narrativeKey.slice('planet:'.length)
      : '') ||
    '';
  if (!entityId) {
    return {
      planet: sessionContext.planet || null,
      entityId: null,
      beatTitle: null,
      beatSummary: null,
      linkedLessonIds: [],
      linkedConceptIds: [],
    };
  }

  const doc = await PlanetNarrative.findOne({ entityId, published: { $ne: false } })
    .select('entityId kind beats stages linkedLessonIds linkedConceptIds panelSchema')
    .lean();

  if (!doc) {
    return {
      planet: sessionContext.planet || entityId,
      entityId,
      beatTitle: null,
      beatSummary: null,
      linkedLessonIds: [],
      linkedConceptIds: [],
    };
  }

  const beats = doc.beats?.length ? doc.beats : doc.stages || [];
  const beat = pickBeat(beats, sessionContext.stageTimeMa);
  const beatTitle = beat?.title || beat?.label || beat?.name || null;
  const beatSummary = excerpt(
    beat?.summary || beat?.description || beat?.body || beat?.narrative || '',
  );

  let panelHint = null;
  const schema = doc.panelSchema;
  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    const keys = Object.keys(schema).slice(0, 4);
    if (keys.length) panelHint = keys.join(', ');
  }

  return {
    planet: sessionContext.planet || doc.kind || 'generic',
    entityId: doc.entityId,
    beatTitle,
    beatSummary,
    panelHint,
    linkedLessonIds: Array.isArray(doc.linkedLessonIds) ? doc.linkedLessonIds.slice(0, 8) : [],
    linkedConceptIds: Array.isArray(doc.linkedConceptIds) ? doc.linkedConceptIds.slice(0, 8) : [],
  };
}

module.exports = { buildNarrativeContext };
