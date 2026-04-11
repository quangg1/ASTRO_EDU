/**
 * Xóa các fossil không trùng bất kỳ cửa sổ Ma nào của Earth History (`earth_history_stages`).
 * Giảm DB khi phần lớn PBDB nằm ngoài các kỉ bạn định nghĩa.
 *
 * Bắt buộc một trong hai:
 *   --dry-run   chỉ đếm, không xóa
 *   --yes       thực hiện deleteMany
 *
 *   node scripts/deleteFossilsOutsideEarthStages.js --dry-run
 *   node scripts/deleteFossilsOutsideEarthStages.js --yes
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
require('dotenv').config()

const mongoose = require('mongoose')
const Fossil = require('../models/Fossil')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history'

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const yes = argv.includes('--yes')

  if ((dryRun && yes) || (!dryRun && !yes)) {
    console.error('Chọn một: --dry-run (xem số bản ghi sẽ xóa) hoặc --yes (xóa thật).')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI, {
    connectTimeoutMS: 120000,
    serverSelectionTimeoutMS: 120000,
  })
  console.log('MongoDB:', mongoose.connection.host)

  const started = Date.now()
  const result = await Fossil.deleteFossilsOutsideEarthHistoryStages({ dryRun })
  console.log(JSON.stringify(result, null, 2))
  console.log('Elapsed ms:', Date.now() - started)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
