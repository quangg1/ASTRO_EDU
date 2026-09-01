const earthHistoryService = require('../../content3d/earth-history/services/earthHistoryService');
const fossilService = require('../../content3d/earth-history/services/fossilService');

const QUATERNARY_BUFFER_MA = 2.6;
const PHANEROZOIC_BUFFER_MA = 50;
const NOTABLE_FOSSIL_LIMIT = 20;
const PHYLA_LIMIT = 8;

/**
 * @param {number} stageTime
 * @returns {{ maxMa: number, minMa: number } | null}
 */
function getFossilTimeRangeForStageTime(stageTime) {
  if (!Number.isFinite(stageTime) || stageTime > 600) return null;
  if (stageTime < 1) {
    return {
      maxMa: stageTime + QUATERNARY_BUFFER_MA,
      minMa: Math.max(0, stageTime - QUATERNARY_BUFFER_MA),
    };
  }
  const buffer = Math.max(stageTime * 0.15, PHANEROZOIC_BUFFER_MA);
  return {
    maxMa: stageTime + buffer,
    minMa: Math.max(0, stageTime - buffer),
  };
}

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
function parseStageTimeMa(raw) {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>|null|undefined} sessionContext
 */
function shouldBuildEarthFossilContext(sessionContext) {
  if (sessionContext?.surface !== 'explore') return false;
  const planet = typeof sessionContext.planet === 'string' ? sessionContext.planet.trim() : '';
  const entityId = typeof sessionContext.entityId === 'string' ? sessionContext.entityId.trim() : '';
  const isEarth =
    planet === 'earth' || planet === 'planet-earth' || entityId === 'planet-earth';
  if (planet && !isEarth) return false;
  const stageTimeMa = parseStageTimeMa(sessionContext.stageTimeMa);
  if (stageTimeMa == null || stageTimeMa > 600) return false;
  return true;
}

/**
 * @param {Record<string, unknown>|null|undefined} sessionContext
 */
async function buildEarthFossilContext(sessionContext) {
  if (!shouldBuildEarthFossilContext(sessionContext)) return null;

  const stageTimeMa = parseStageTimeMa(sessionContext?.stageTimeMa);
  if (stageTimeMa == null) return null;

  const range = getFossilTimeRangeForStageTime(stageTimeMa);
  if (!range || range.maxMa < range.minMa) return null;

  const { maxMa, minMa } = range;

  const [stage, totalInDb, phylaDistribution, notableAgg] = await Promise.all([
    earthHistoryService.findNearestActiveStageByTime(stageTimeMa),
    fossilService.countAcceptedInTimeRange({ maxMa, minMa }),
    fossilService.getPhylaDistribution(maxMa, minMa),
    fossilService.listNotableFossils({ maxMa, minMa, limit: NOTABLE_FOSSIL_LIMIT }),
  ]);

  const topPhyla = (phylaDistribution || [])
    .filter((row) => row?.phylum)
    .slice(0, PHYLA_LIMIT)
    .map((row) => ({
      phylum: row.phylum,
      count: row.count ?? 0,
      generaCount: row.generaCount ?? 0,
    }));

  const focusedName =
    typeof sessionContext?.focusedFossilName === 'string'
      ? sessionContext.focusedFossilName.trim()
      : '';
  const focusedPhylum =
    typeof sessionContext?.focusedFossilPhylum === 'string'
      ? sessionContext.focusedFossilPhylum.trim()
      : '';
  const focusedId =
    typeof sessionContext?.focusedFossilId === 'string'
      ? sessionContext.focusedFossilId.trim()
      : '';
  const selectedFossil =
    focusedName || focusedId
      ? {
          id: focusedId || null,
          name: focusedName || null,
          phylum: focusedPhylum || null,
        }
      : null;

  return {
    stageTimeMa,
    stageName: stage?.name ?? null,
    stageNameEn: stage?.nameEn ?? null,
    timeDisplay: stage?.timeDisplay ?? null,
    eon: stage?.eon ?? null,
    era: stage?.era ?? null,
    period: stage?.period ?? null,
    timeRange: { maxMa, minMa },
    totalInDb,
    topPhyla,
    notableFossils: notableAgg || [],
    selectedFossil,
    groundingNoteVi:
      'Chỉ nhắc tên loài/hóa thạch cụ thể nằm trong danh sách notableFossils hoặc ngạnh trong topPhyla; không bịa tên ngoài CSDL.',
  };
}

module.exports = {
  buildEarthFossilContext,
  shouldBuildEarthFossilContext,
  getFossilTimeRangeForStageTime,
  parseStageTimeMa,
};
