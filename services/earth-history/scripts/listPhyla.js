/**
 * Script: Liệt kê đầy đủ các chủng loại hóa thạch (phylum) trong MongoDB.
 * Dùng để dịch tên Việt và viết mô tả cho từng phylum, rồi cập nhật client/src/lib/fossilPhyla.ts
 *
 * Chạy: từ thư mục server
 *   node scripts/listPhyla.js
 *
 * Cần: MONGODB_URI (hoặc mặc định mongodb://localhost:27017/earth_history)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history';

// Màu mặc định cho phylum chưa có trong fossilPhyla.ts (phân bổ đều trên palette)
const DEFAULT_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#a55eea', '#ff9ff3', '#26de81', '#00b894',
  '#fd79a8', '#e17055', '#55efc4', '#00cec9', '#fab1a0', '#dfe6e9', '#e8a030', '#5c6bc0',
  '#4dd0e1', '#9e9e9e', '#ffcc80', '#e57373', '#81c784', '#ba68c8', '#ff8a65', '#4fc3f7',
];

async function listPhyla() {
  try {
    await mongoose.connect(MONGODB_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB Connected:', MONGODB_URI.replace(/\/\/[^@]+@/, '//***@'));

    const db = mongoose.connection.db;
    const fossils = db.collection('fossils');

    const pipeline = [
      { $match: { 'taxonomy.phylum': { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$taxonomy.phylum', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    const phyla = await fossils.aggregate(pipeline).toArray();

    if (phyla.length === 0) {
      console.log('Không tìm thấy phylum nào trong collection fossils.');
      process.exit(0);
      return;
    }

    console.log('\n=== TỔNG HỢP PHYLUM TRONG DB ===');
    console.log('Số lượng phylum:', phyla.length);
    console.log('Tổng số mẫu:', phyla.reduce((s, p) => s + p.count, 0));
    console.log('\n--- Danh sách (phylum | số mẫu) ---\n');
    phyla.forEach((p, i) => console.log(`${i + 1}. ${p._id} | ${p.count}`));

    // Tạo object để paste vào fossilPhyla.ts (chỉ phylum chưa có nameVi/description)
    const existingPhyla = new Set([
      'Arthropoda', 'Mollusca', 'Chordata', 'Brachiopoda', 'Echinodermata', 'Cnidaria',
      'Bryozoa', 'Porifera', 'Foraminifera', 'Radiolaria', 'Angiospermae', 'Pteridophyta',
      'Hemichordata', 'Nematoda', 'default',
    ]);

    const entries = phyla.map((p, i) => {
      const phylum = p._id == null ? 'Unknown' : String(p._id);
      const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      const needsTranslation = !existingPhyla.has(phylum);
      return {
        phylum,
        count: p.count,
        color,
        nameVi: needsTranslation ? `TODO: dịch tên Việt cho "${phylum}"` : '(đã có)',
        description: needsTranslation ? 'TODO: mô tả ngắn cho nhóm này.' : '(đã có)',
      };
    });

    const outDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // 1) JSON đầy đủ (để tool/script khác dùng)
    const jsonPath = path.join(outDir, 'phyla-list.json');
    fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2), 'utf8');
    console.log('\nĐã ghi:', jsonPath);

    // 2) File text từng dòng: phylum \t count \t nameVi \t description (dễ điền tay)
    const txtPath = path.join(outDir, 'phyla-for-translation.txt');
    const txtLines = [
      '# Dán vào fossilPhyla.ts hoặc điền nameVi, description rồi dùng script sinh lại.',
      '# Cột: phylum | count | nameVi (TODO) | description (TODO)',
      '',
      ...entries.map(e =>
        [e.phylum, e.count, e.nameVi, e.description].join('\t')
      ),
    ];
    fs.writeFileSync(txtPath, txtLines.join('\n'), 'utf8');
    console.log('Đã ghi:', txtPath);

    // 3) Đoạn TypeScript để thêm vào PHYLUM_INFO (chỉ phylum chưa có)
    const missing = entries.filter(e => e.nameVi.startsWith('TODO'));
    if (missing.length > 0) {
      const tsSnippet = [
        '// === Dán vào PHYLUM_INFO trong client/src/lib/fossilPhyla.ts (điền nameVi, description) ===',
        '',
        ...missing.map((e, i) => {
          const safeKey = (e.phylum == null ? 'Unknown' : String(e.phylum)).replace(/'/g, "\\'");
          return `  '${safeKey}': {
    nameVi: 'TODO: dịch tên Việt',
    description: 'TODO: mô tả ngắn.',
    color: '${e.color}',
  },`;
        }),
        '',
      ].join('\n');
      const tsPath = path.join(outDir, 'phyla-snippet-for-fossilPhyla.ts.txt');
      fs.writeFileSync(tsPath, tsSnippet, 'utf8');
      console.log('Đã ghi:', tsPath);
      console.log('\nSố phylum cần dịch/thêm mô tả:', missing.length);
    }

    console.log('\nXong. Kiểm tra thư mục server/scripts/output/');
  } catch (err) {
    console.error('Lỗi:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Đã ngắt kết nối MongoDB.');
  }
}

listPhyla();
