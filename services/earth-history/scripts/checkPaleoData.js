/**
 * Kiểm tra dữ liệu paleogeography trong fossils collection
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history';

async function check() {
  await mongoose.connect(MONGODB_URI, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });
  console.log('MongoDB Connected');

  const db = mongoose.connection.db;

  // Sample fossil có geoplate
  const sample = await db.collection('fossils').findOne({
    'paleoLocation.geoplate': { $exists: true, $ne: null }
  });
  console.log('\n=== SAMPLE FOSSIL ===');
  console.log('paleoLocation:', JSON.stringify(sample?.paleoLocation, null, 2));
  console.log('location:', JSON.stringify(sample?.location, null, 2));
  console.log('time:', JSON.stringify(sample?.time, null, 2));

  // Đếm số lượng có geoplate
  const withGeoplate = await db.collection('fossils').countDocuments({
    'paleoLocation.geoplate': { $exists: true, $ne: null }
  });
  const total = await db.collection('fossils').countDocuments({});
  console.log('\n=== THỐNG KÊ ===');
  console.log('Fossils có geoplate:', withGeoplate, '/', total);

  // Danh sách geoplate unique
  const geoplates = await db.collection('fossils').distinct('paleoLocation.geoplate');
  console.log('Số lượng geoplate (mảng kiến tạo) khác nhau:', geoplates.length);
  console.log('Geoplates (20 đầu):', geoplates.slice(0, 20));

  // Kiểm tra có trường nào chứa tên vùng cổ địa lý không
  const sampleWithAll = await db.collection('fossils').findOne({});
  console.log('\n=== CÁC TRƯỜNG CÓ SẴN ===');
  console.log('Top-level keys:', Object.keys(sampleWithAll || {}));

  await mongoose.disconnect();
}

check().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
