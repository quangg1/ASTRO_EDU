/**
 * Phân tích phủ Earth History trên collection `fossils`:
 * - Tổng số stage trong DB
 * - Đếm fossil theo earthStageId / chưa gán
 * - Fossil trùng ít nhất một cửa sổ stage vs không trùng stage nào
 * - perStageOverlap: overlapCount (có trùng) vs assignedCount (đã gán)
 *
 * Usage:
 *   node scripts/analyzeFossilEarthStages.js
 *   MONGODB_URI=... node scripts/analyzeFossilEarthStages.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
require('dotenv').config()

const mongoose = require('mongoose')
const Fossil = require('../models/Fossil')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history'

async function main() {
  await mongoose.connect(MONGODB_URI, {
    connectTimeoutMS: 120000,
    serverSelectionTimeoutMS: 120000,
  })
  console.log('MongoDB:', mongoose.connection.host, '\n')

  const started = Date.now()
  const result = await Fossil.analyzeEarthStageCoverage()
  console.log(JSON.stringify(result, null, 2))
  console.log('\nElapsed ms:', Date.now() - started)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
