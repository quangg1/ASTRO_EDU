/**
 * Giảm dung lượng collection `fossils`, chia đều theo ngành (`taxonomy.phylum`).
 *
 * Mặc định `--mode=earth`: khớp **Earth History** (`earth_history_stages`) — cửa sổ Ma như
 * client `mapServerStageToClient` (`time` / `timeEnd`). Gán `earthStageId` rồi giữ tối đa N
 * bản ghi / stage.
 *
 * `--mode=period`: theo chuỗi PBDB `time.period` (cách cũ).
 *
 * Usage:
 *   node scripts/pruneFossilsByPeriod.js --dry-run
 *   node scripts/pruneFossilsByPeriod.js --mode=earth --dry-run
 *   node scripts/pruneFossilsByPeriod.js --mode=earth --max=20000
 *   node scripts/pruneFossilsByPeriod.js --assign-only --dry-run
 *   node scripts/pruneFossilsByPeriod.js --skip-assign --mode=earth   # đã gán earthStageId
 *   node scripts/pruneFossilsByPeriod.js --reset-assign               # xóa earthStageId, rồi gán lại
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
require('dotenv').config()

const mongoose = require('mongoose')
const Fossil = require('../models/Fossil')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history'

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const modeArg = argv.find((a) => a.startsWith('--mode='))
  const mode = modeArg ? modeArg.split('=')[1].trim().toLowerCase() : 'earth'
  const maxArg = argv.find((a) => a.startsWith('--max='))
  const maxCap = maxArg ? parseInt(maxArg.split('=')[1], 10) : 20000
  const assignOnly = argv.includes('--assign-only')
  const skipAssign = argv.includes('--skip-assign')
  const resetAssign = argv.includes('--reset-assign')

  if (Number.isNaN(maxCap) || maxCap < 1) {
    console.error('Invalid --max= value')
    process.exit(1)
  }

  if (mode !== 'earth' && mode !== 'period') {
    console.error('Use --mode=earth or --mode=period')
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI, {
    connectTimeoutMS: 120000,
    serverSelectionTimeoutMS: 120000,
  })
  console.log('MongoDB connected:', mongoose.connection.host)
  console.log('Options: mode=%s, max=%d, dryRun=%s, assignOnly=%s, skipAssign=%s, resetAssign=%s',
    mode, maxCap, dryRun, assignOnly, skipAssign, resetAssign)

  if (!dryRun && !assignOnly && mode === 'earth' && !resetAssign) {
    console.warn('WARNING: this will UPDATE earthStageId and/or DELETE documents. Run with --dry-run first.')
  }
  if (!dryRun && (mode === 'period' || (mode === 'earth' && !assignOnly))) {
    console.warn('WARNING: DELETE path enabled.')
  }

  const started = Date.now()

  if (resetAssign && !dryRun) {
    const unset = await Fossil.updateMany({}, { $unset: { earthStageId: 1 } })
    console.log('Reset earthStageId:', unset.modifiedCount, 'documents touched')
  } else if (resetAssign && dryRun) {
    const n = await Fossil.countDocuments({ earthStageId: { $exists: true } })
    console.log('[dry-run] Would $unset earthStageId on documents where field exists (~', n, ')')
  }

  if (mode === 'earth') {
    if (!skipAssign) {
      const assignRes = await Fossil.assignEarthHistoryStages({ dryRun })
      console.log('\nassignEarthHistoryStages:', JSON.stringify(assignRes, null, 2))
    }
    if (assignOnly) {
      console.log('\nElapsed ms:', Date.now() - started)
      await mongoose.disconnect()
      return
    }
    const pruneRes = await Fossil.pruneByEarthHistoryStageBalancedPhylum({
      maxPerStage: maxCap,
      dryRun,
    })
    console.log('\npruneByEarthHistoryStageBalancedPhylum:', JSON.stringify(pruneRes, null, 2))
  } else {
    const pruneRes = await Fossil.pruneByPeriodBalancedPhylum({ maxPerPeriod: maxCap, dryRun })
    console.log('\npruneByPeriodBalancedPhylum:', JSON.stringify(pruneRes, null, 2))
  }

  console.log('\nElapsed ms:', Date.now() - started)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
