/**
 * Seed metadata phylum vào MongoDB: nameVi + description đầy đủ từ phylaFullDescriptions.js,
 * màu và danh sách phylum từ phyla-list.json.
 * Chạy từ thư mục server: npm run seed-phylum-metadata
 * Cần chạy npm run list-phyla trước để có phyla-list.json.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PhylumMetadata = require('../models/PhylumMetadata');
const phylaFullDescriptions = require('./phylaFullDescriptions');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history';
const JSON_PATH = path.join(__dirname, '../scripts/output/phyla-list.json');

async function seed() {
  try {
    if (!fs.existsSync(JSON_PATH)) {
      console.error('Không tìm thấy phyla-list.json. Chạy: npm run list-phyla');
      process.exit(1);
    }
    const list = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    if (!Array.isArray(list) || list.length === 0) {
      console.error('phyla-list.json rỗng hoặc không đúng định dạng.');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB Connected');

    let upserted = 0;
    for (const row of list) {
      const phylum = row.phylum == null ? 'Unknown' : String(row.phylum).trim();
      if (!phylum) continue;
      const desc = phylaFullDescriptions[phylum];
      const nameVi = desc ? desc.nameVi : (row.nameVi ?? '');
      const description = desc ? desc.description : (row.description ?? '');
      await PhylumMetadata.updateOne(
        { phylum },
        {
          $set: {
            nameVi,
            description,
            color: row.color ?? '#9ca3af',
            locale: 'vi',
          },
        },
        { upsert: true }
      );
      upserted++;
    }

    // Đảm bảo "Unknown" có trong DB (fossils có phylum null được gom thành Unknown ở client)
    if (!phylaFullDescriptions.Unknown) {
      await PhylumMetadata.updateOne(
        { phylum: 'Unknown' },
        {
          $set: {
            nameVi: 'Chưa xác định',
            description: 'Nhóm sinh vật cổ chưa xác định ngành trong cơ sở dữ liệu hóa thạch.',
            color: '#9ca3af',
            locale: 'vi',
          },
        },
        { upsert: true }
      );
      upserted++;
    }

    console.log('Đã upsert', upserted, 'phylum metadata (nameVi + description đầy đủ) vào collection phylum_metadata.');
  } catch (err) {
    console.error('Lỗi:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
