const { AppError } = require('../../../../shared/errors');
const { earthHistoryRepository } = require('../repositories/earthHistoryRepository');

const EONS = ['Hadean', 'Archean', 'Proterozoic', 'Phanerozoic'];

function listStages() {
  return earthHistoryRepository.listAllStages();
}

async function getStage(stageId) {
  const stage = await earthHistoryRepository.findActiveStage(stageId);
  if (!stage) throw AppError.notFound('Stage not found');
  return stage;
}

function listByEon(eon) {
  return earthHistoryRepository.listByEon(eon);
}

function listByTimeRange(startMya, endMya) {
  return earthHistoryRepository.listByTimeRange(startMya, endMya);
}

function listExtinctionEvents() {
  return earthHistoryRepository.listExtinctionEvents();
}

function listSummary() {
  return earthHistoryRepository.listSummary();
}

function getStats() {
  return earthHistoryRepository.statsOverview();
}

/** Stage active gần nhất với thời gian ≤ `stageTimeMa` (agent Earth fossil context). */
function findNearestActiveStageByTime(stageTimeMa) {
  if (!Number.isFinite(stageTimeMa)) return Promise.resolve(null);
  return earthHistoryRepository.findNearestActiveByTime(stageTimeMa);
}

/**
 * Editor gửi lên hình dạng phẳng của UI; chuyển về document trước khi ghi.
 * Trả về null cho hàng thiếu định danh hoặc tên để bỏ qua thay vì làm hỏng cả lô.
 */
function mapClientStageToDoc(raw, orderFallback) {
  const stageId = Number(raw?.id ?? raw?.stageId);
  if (!Number.isFinite(stageId)) return null;
  const name = String(raw?.name || '').trim();
  if (!name) return null;

  const time = Number(raw?.time);
  const eon = String(raw?.eon || 'Phanerozoic').trim();
  const desc = String(raw?.description || '').trim();

  return {
    stageId,
    name,
    nameEn: String(raw?.nameEn || name).trim(),
    icon: String(raw?.icon || '🌍')
      .trim()
      .slice(0, 8),
    time: Number.isFinite(time) ? time : 0,
    timeEnd:
      raw?.minMa != null ? Number(raw.minMa) : raw?.timeEnd != null ? Number(raw.timeEnd) : undefined,
    timeDisplay: String(raw?.timeDisplay || '').trim(),
    eon: EONS.includes(eon) ? eon : 'Phanerozoic',
    era: raw?.era ? String(raw.era) : null,
    period: raw?.period ? String(raw.period) : null,
    atmosphere: {
      o2: Number(raw?.o2) || 0,
      co2: Number(raw?.co2) || 0,
    },
    astronomy: {
      dayLength: Number(raw?.dayLength) || 24,
    },
    visual: {
      earthColor: String(raw?.earthColor || '#6B93D6').trim(),
      textureUrl: raw?.textureUrl ? String(raw.textureUrl).trim() : undefined,
    },
    flags: {
      hasDebris: Boolean(raw?.hasDebris),
      hasMeteorites: Boolean(raw?.hasMeteorites),
      hasMoon: raw?.hasMoon !== false,
      isExtinction: Boolean(raw?.isExtinction),
    },
    description: { vi: desc || name, en: String(raw?.descriptionEn || '').trim() || undefined },
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : orderFallback,
    isActive: true,
  };
}

async function replaceStages(items) {
  if (!items.length) throw AppError.badRequest('stages[] trống');

  const docs = items
    .map((raw, index) => mapClientStageToDoc(raw, index + 1))
    .filter(Boolean);
  if (!docs.length) throw AppError.badRequest('Không có stage hợp lệ');

  await earthHistoryRepository.upsertStages(docs);
  return earthHistoryRepository.listAllStages();
}

module.exports = {
  listStages,
  getStage,
  listByEon,
  listByTimeRange,
  listExtinctionEvents,
  listSummary,
  getStats,
  findNearestActiveStageByTime,
  replaceStages,
};
