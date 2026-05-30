/**
 * Một lần: gán providerId = email cho user local (sửa index provider_1_providerId_1).
 * Chạy: node scripts/migrate-local-provider-id.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../features/auth/models/User');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const users = await User.find({
    provider: 'local',
    email: { $exists: true, $ne: '' },
    $or: [{ providerId: null }, { providerId: { $exists: false } }, { providerId: '' }],
  });
  let n = 0;
  for (const u of users) {
    u.providerId = String(u.email).trim().toLowerCase();
    await u.save({ validateBeforeSave: false });
    n += 1;
  }
  console.log(`Đã cập nhật providerId cho ${n} tài khoản local.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
