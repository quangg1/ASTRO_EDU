const { AppError } = require('../../../../shared/errors');
const {
  earthHistoryRepository,
  fossilRepository,
} = require('../repositories/earthHistoryRepository');
const { getPaleoRegionNameString } = require('../lib/paleoPlateNames');

/** Mẫu quanh một stage được nới rộng để tránh khung thời gian rỗng. */
const MIN_STAGE_BUFFER_MA = 5;
const STAGE_BUFFER_RATIO = 0.1;

function withRegionName(fossil, locale) {
  return { ...fossil, paleoRegionName: getPaleoRegionNameString(fossil.geoplate, locale) };
}

async function listByTimeRange({ maxMa, minMa, limit, locale }) {
  const actualMax = Math.max(maxMa, minMa);
  const actualMin = Math.min(maxMa, minMa);

  const [total, rawFossils] = await Promise.all([
    fossilRepository.countInTimeRange(actualMax, actualMin),
    fossilRepository.sampleForVisualization(actualMax, actualMin, limit),
  ]);

  const data = rawFossils.map((fossil) => withRegionName(fossil, locale));
  return { timeRange: { maxMa: actualMax, minMa: actualMin }, total, count: data.length, data };
}

function toSearchResult(fossil, locale) {
  return {
    name: fossil.taxonomy?.acceptedName || 'Unknown',
    phylum: fossil.taxonomy?.phylum || null,
    class: fossil.taxonomy?.class,
    maxMa: fossil.time?.maxMa,
    minMa: fossil.time?.minMa,
    lng: fossil.location?.lng,
    lat: fossil.location?.lat,
    paleolng: fossil.paleoLocation?.paleolng,
    paleolat: fossil.paleoLocation?.paleolat,
    geoplate: fossil.paleoLocation?.geoplate ?? null,
    environment: fossil.ecology?.taxonEnvironment || fossil.geology?.environment || null,
    paleoRegionName: getPaleoRegionNameString(fossil.paleoLocation?.geoplate, locale),
  };
}

async function search({ query, limit, locale, maxMa, minMa }) {
  if (query.length < 2) throw AppError.badRequest('Query must be at least 2 characters');

  const timeFilter =
    maxMa != null && minMa != null
      ? { 'time.maxMa': { $lte: maxMa }, 'time.minMa': { $gte: minMa } }
      : {};

  // Cụm nhiều từ tìm theo cụm nguyên vẹn; dấu nháy trong chuỗi phải bỏ đi
  // để không phá cú pháp $text.
  const searchExpr = query.includes(' ') ? `"${query.replace(/"/g, '')}"` : query;

  let raw;
  try {
    raw = await fossilRepository.searchByText(searchExpr, timeFilter, limit);
  } catch {
    // Không có text index (hoặc cú pháp bị từ chối) thì lùi về khớp tên.
    raw = await fossilRepository.searchByName(query, timeFilter, limit);
  }

  const data = raw.map((fossil) => toSearchResult(fossil, locale));
  return { count: data.length, data };
}

function getStats() {
  return fossilRepository.stats();
}

function countAcceptedInTimeRange({ maxMa, minMa }) {
  return fossilRepository.countAcceptedInTimeRange(maxMa, minMa);
}

function getPhylaDistribution(maxMa, minMa) {
  return fossilRepository.phylaDistribution(maxMa, minMa);
}

function listNotableFossils({ maxMa, minMa, limit = 20 } = {}) {
  return fossilRepository.listNotableAccepted(maxMa, minMa, limit);
}

async function listForStage({ stageId, limit, locale }) {
  const stage = await earthHistoryRepository.findStage(stageId);
  if (!stage) throw AppError.notFound('Stage not found');

  const buffer = Math.max(stage.time * STAGE_BUFFER_RATIO, MIN_STAGE_BUFFER_MA);
  const maxMa = stage.time + buffer;
  const minMa = Math.max(0, stage.time - buffer);

  const [rawFossils, phylaDistribution] = await Promise.all([
    fossilRepository.sampleForVisualization(maxMa, minMa, limit),
    fossilRepository.phylaDistribution(maxMa, minMa),
  ]);

  const data = rawFossils.map((fossil) => withRegionName(fossil, locale));
  return {
    stage: {
      id: stage.stageId,
      name: stage.name,
      time: stage.time,
      timeDisplay: stage.timeDisplay,
    },
    timeRange: { maxMa, minMa },
    fossils: { count: data.length, data },
    phylaDistribution,
  };
}

module.exports = {
  listByTimeRange,
  search,
  getStats,
  listForStage,
  countAcceptedInTimeRange,
  getPhylaDistribution,
  listNotableFossils,
};
