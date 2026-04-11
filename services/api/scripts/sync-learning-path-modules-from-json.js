/**
 * Đẩy modules (kèm topicWeights) từ learningPathDefault.json → MongoDB document slug=main.
 * Chạy từ services/api: node scripts/sync-learning-path-modules-from-json.js
 * Cần MongoDB (MONGODB_URI trong .env hoặc mặc định localhost/galaxies).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const path = require('path')
const fs = require('fs')
const LearningPath = require('../features/courses/models/LearningPath')

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies'

async function main() {
  await mongoose.connect(uri)
  const p = path.join(__dirname, '../data/learningPathDefault.json')
  const { modules } = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (!Array.isArray(modules)) throw new Error('Invalid JSON: modules')
  await LearningPath.findOneAndUpdate(
    { slug: 'main' },
    { $set: { modules } },
    { upsert: true, new: true },
  )
  console.log(`Synced ${modules.length} modules from learningPathDefault.json → ${uri}`)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
