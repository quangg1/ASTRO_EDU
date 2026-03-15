/**
 * Migrate tất cả collections từ các DB cũ sang galaxies (API gộp).
 *
 * Nguồn:
 *   galaxies_auth     → users
 *   galaxies_courses  → courses, enrollments, tutorials, tutorialcategories
 *   galaxies_community → forums, posts, comments, votes
 *   galaxies_payment  → orders
 *
 * Chạy: cd services/api && node scripts/migrate-all-dbs.js
 * Cần MongoDB chạy, MONGODB_URI trong .env (ví dụ mongodb://localhost:27017).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

const MAPPINGS = [
  { sourceDb: 'galaxies_auth', collection: 'users' },
  { sourceDb: 'galaxies_courses', collection: 'courses' },
  { sourceDb: 'galaxies_courses', collection: 'enrollments' },
  { sourceDb: 'galaxies_courses', collection: 'tutorials' },
  { sourceDb: 'galaxies_courses', collection: 'tutorialcategories' },
  { sourceDb: 'galaxies_community', collection: 'forums' },
  { sourceDb: 'galaxies_community', collection: 'posts' },
  { sourceDb: 'galaxies_community', collection: 'comments' },
  { sourceDb: 'galaxies_community', collection: 'votes' },
  { sourceDb: 'galaxies_payment', collection: 'orders' },
];

async function migrateCollection(connSource, connTarget, sourceDbName, collectionName) {
  const sourceCol = connSource.db.collection(collectionName);
  const count = await sourceCol.countDocuments();
  if (count === 0) {
    console.log(`  ${sourceDbName}.${collectionName}: 0 documents, skip`);
    return { inserted: 0, skipped: 0 };
  }

  const docs = await sourceCol.find({}).toArray();
  const targetCol = connTarget.db.collection(collectionName);
  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));

  const result = await targetCol.bulkWrite(ops, { ordered: false });
  const inserted = result.upsertedCount || 0;
  const skipped = docs.length - inserted;
  console.log(`  ${sourceDbName}.${collectionName}: ${docs.length} total → ${inserted} inserted, ${skipped} skipped (already exist)`);
  return { inserted, skipped };
}

async function run() {
  const connGalaxies = await mongoose.createConnection(`${baseUri}/galaxies`).asPromise();

  const dbsSeen = new Set();
  const connections = {};

  try {
    for (const { sourceDb, collection } of MAPPINGS) {
      if (!dbsSeen.has(sourceDb)) {
        dbsSeen.add(sourceDb);
        connections[sourceDb] = await mongoose.createConnection(`${baseUri}/${sourceDb}`).asPromise();
      }

      const connSource = connections[sourceDb];
      await migrateCollection(connSource, connGalaxies, sourceDb, collection);
    }

    console.log('\nMigration done. Unified DB: galaxies');
  } finally {
    await connGalaxies.destroy();
    for (const conn of Object.values(connections)) {
      await conn.destroy();
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
