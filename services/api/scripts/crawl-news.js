/**
 * CLI crawl tin thiên văn — logic nằm trong newsCrawlService (scheduler API dùng chung).
 *
 * Chạy: cd services/api && npm run crawl-news
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { runNewsCrawl } = require('../features/community/services/newsCrawlService');
const CommunityJobState = require('../features/community/models/CommunityJobState');
const { JOB_ID } = require('../features/community/jobs/newsCrawlScheduler');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI trong .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Đã kết nối MongoDB');

  const result = await runNewsCrawl();
  await CommunityJobState.updateOne(
    { jobId: JOB_ID },
    { $set: { lastRunAt: new Date(), lastResult: result } },
    { upsert: true },
  );

  await mongoose.disconnect();
  process.exit(result.errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
