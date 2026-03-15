/**
 * Tạo text index cho tìm kiếm hóa thạch theo tên (giảm delay khi collection lớn).
 * Chạy một lần sau khi có nhiều dữ liệu: node scripts/createSearchIndex.js
 * (Hoặc restart server — Mongoose sẽ tạo index từ schema.)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history';

async function run() {
  await mongoose.connect(MONGODB_URI);
  const coll = mongoose.connection.collection('fossils');
  const name = 'acceptedName_text';
  const existing = await coll.indexes();
  if (existing.some((idx) => idx.name === name)) {
    console.log('Text index "%s" đã tồn tại.', name);
    process.exit(0);
    return;
  }
  await coll.createIndex(
    { 'taxonomy.acceptedName': 'text' },
    { default_language: 'none', name }
  );
  console.log('Đã tạo text index "%s". Tìm kiếm sẽ nhanh hơn.', name);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
