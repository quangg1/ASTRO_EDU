const ShowcaseUnlock = require('../../../rewards/models/ShowcaseUnlock');

/**
 * @param {string} userId
 * @param {string} entityId
 */
async function hasShowcaseUnlock(userId, entityId) {
  if (!userId || !entityId) return false;
  const id = String(entityId).trim();
  const rows = await ShowcaseUnlock.find({ userId, entityId: id }).lean();
  return rows.length > 0;
}

module.exports = { hasShowcaseUnlock };
