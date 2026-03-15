/**
 * Migrate users từ galaxies_auth.users sang galaxies.users
 * Chạy từ thư mục services/api: node scripts/migrate-users-from-auth.js
 * Cần MongoDB chạy. Set MONGODB_URI (cùng cluster), script dùng 2 DB names.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function run() {
  const connAuth = await mongoose.createConnection(`${baseUri}/galaxies_auth`).asPromise();
  const connGalaxies = await mongoose.createConnection(`${baseUri}/galaxies`).asPromise();

  try {
    const users = await connAuth.db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users in galaxies_auth.users`);

    if (users.length === 0) {
      console.log('Nothing to migrate.');
      return;
    }

    const target = connGalaxies.db.collection('users');
    const ops = users.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }));

    const result = await target.bulkWrite(ops, { ordered: false });
    console.log('Done. Inserted:', result.upsertedCount, '(existing _id skipped).');
  } finally {
    await connAuth.destroy();
    await connGalaxies.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
