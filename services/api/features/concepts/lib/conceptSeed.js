const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '../../../data/learningPathDefault.json');

/**
 * Seed là dữ liệu khởi tạo tùy chọn: thiếu file hay file hỏng thì hệ thống vẫn
 * chạy với danh sách concept rỗng thay vì chết lúc khởi động.
 */
function loadConceptSeed() {
  try {
    if (!fs.existsSync(SEED_PATH)) return [];
    const data = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    return Array.isArray(data.concepts) ? data.concepts : [];
  } catch (err) {
    console.error('concept seed read error:', err);
    return [];
  }
}

module.exports = { loadConceptSeed };
