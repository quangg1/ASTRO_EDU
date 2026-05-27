/**
 * User local cũ (trước xác nhận email) → emailVerified: true
 * node scripts/migrate-email-verified-legacy.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../features/auth/models/User');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const r = await User.updateMany(
    { provider: 'local', emailVerified: { $ne: true } },
    { $set: { emailVerified: true } },
  );
  console.log(`Đã đánh dấu emailVerified cho ${r.modifiedCount} user local.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
