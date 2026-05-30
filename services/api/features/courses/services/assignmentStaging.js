const { storageObjectExists } = require('../../media/uploadStorage');

const STAGING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isStagingExpired(uploadedAt) {
  if (!uploadedAt) return true;
  return new Date(uploadedAt).getTime() < Date.now() - STAGING_MAX_AGE_MS;
}

/**
 * @param {Array<{ storageKey: string, status?: string, uploadedAt?: Date }>} stagingFiles
 */
async function validateStagingFiles(stagingFiles) {
  const out = [];
  for (const f of stagingFiles || []) {
    const expiredByAge = isStagingExpired(f.uploadedAt);
    let exists = false;
    if (!expiredByAge && f.storageKey) {
      try {
        exists = await storageObjectExists(f.storageKey);
      } catch (e) {
        console.error('[assignmentStaging] headObject error:', f.storageKey, e.message);
        exists = false;
      }
    }
    const status = expiredByAge || !exists || f.status === 'expired' ? 'expired' : 'ok';
    out.push({ ...f, status });
  }
  return out;
}

module.exports = {
  STAGING_MAX_AGE_MS,
  isStagingExpired,
  validateStagingFiles,
};
