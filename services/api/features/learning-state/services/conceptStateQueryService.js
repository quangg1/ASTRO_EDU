const {
  conceptLearningStateRepository,
} = require('../repositories/learningStateRepository');

const DEFAULT_CONFIDENCE = 0.5;

/** Chip trạng thái trong panel Explore chỉ cần vài số, không cần cả bản ghi. */
function toConceptChip(row) {
  return {
    conceptId: row.conceptId,
    mastery: row.mastery ?? 0,
    confidence: row.confidence ?? DEFAULT_CONFIDENCE,
    nextBestAction: row.nextBestAction || 'none',
    attemptCount: row.attemptCount ?? 0,
    lastPassedAt: row.lastPassedAt || null,
    misconceptionCount: Array.isArray(row.misconceptions) ? row.misconceptions.length : 0,
  };
}

async function getConceptChips(userId, conceptIds) {
  if (!conceptIds.length) return [];
  const rows = await conceptLearningStateRepository.listForConcepts(userId, conceptIds);
  return rows.map(toConceptChip);
}

module.exports = { getConceptChips };
