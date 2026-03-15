/**
 * Tạo tài khoản admin trong DB galaxies.
 *
 * Chạy: cd services/api && node scripts/seed-admin-teacher.js
 *
 * Biến môi trường (.env hoặc truyền khi chạy):
 *   ADMIN_EMAIL         (mặc định: admin@galaxies.edu)
 *   ADMIN_PASSWORD      (mặc định: admin123 - nên đổi sau lần đăng nhập đầu)
 *   ADMIN_DISPLAY_NAME  (tùy chọn)
 *
 * Nếu email đã tồn tại thì chỉ cập nhật role thành admin.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function run() {
  await mongoose.connect(`${baseUri}/galaxies`);
  const usersCol = mongoose.connection.db.collection('users');

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@galaxies.edu').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';

  const existing = await usersCol.findOne({ email: adminEmail });
  if (existing) {
    const hashed = adminPassword.length >= 6 ? await bcrypt.hash(adminPassword, 10) : undefined;
    await usersCol.updateOne(
      { email: adminEmail },
      {
        $set: {
          role: 'admin',
          displayName: adminDisplayName,
          ...(hashed && { password: hashed }),
          updatedAt: new Date(),
        },
      }
    );
    console.log('Admin đã tồn tại → cập nhật role & displayName:', adminEmail);
  } else {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await usersCol.insertOne({
      email: adminEmail,
      password: hashed,
      displayName: adminDisplayName,
      provider: 'local',
      providerId: adminEmail,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Đã tạo admin:', adminEmail, '| Mật khẩu:', adminPassword, '(nên đổi sau)');
  }
  console.log('Xong. Đăng nhập bằng email + mật khẩu trên.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
