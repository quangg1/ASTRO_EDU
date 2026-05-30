/**
 * Cron/worker: remove staging files older than 24h, delete storage orphans, sync draft rows.
 * Run: node features/courses/workers/cleanupOrphanUploads.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { deleteStorageObject } = require('../../media/uploadStorage');
const { STAGING_MAX_AGE_MS, isStagingExpired } = require('../services/assignmentStaging');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const drafts = await AssignmentSubmission.find({ status: 'draft' }).lean();
  let updated = 0;
  let deletedObjects = 0;
  for (const doc of drafts) {
    const staging = doc.stagingFiles || [];
    const kept = [];
    for (const f of staging) {
      const expired = isStagingExpired(f.uploadedAt) || f.status === 'expired';
      if (expired && f.storageKey) {
        try {
          const ok = await deleteStorageObject(f.storageKey);
          if (ok) deletedObjects += 1;
        } catch (e) {
          console.warn('[cleanupOrphanUploads] delete failed:', f.storageKey, e.message);
        }
        continue;
      }
      kept.push(f);
    }
    if (kept.length !== staging.length) {
      await AssignmentSubmission.updateOne(
        { _id: doc._id },
        { $set: { stagingFiles: kept, stagingExpired: kept.length === 0 && staging.length > 0 } },
      );
      updated += 1;
    }
  }
  console.log(
    `[cleanupOrphanUploads] drafts synced: ${updated}, storage deleted: ${deletedObjects}, maxAgeMs: ${STAGING_MAX_AGE_MS}`,
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
