const CommunityJobState = require('../models/CommunityJobState');
const { runNewsCrawl } = require('../services/newsCrawlService');

const JOB_ID = 'news_crawl';
const INTERVAL_MS = 24 * 60 * 60 * 1000;
const CHECK_MS = 60 * 60 * 1000;
const STARTUP_DELAY_MS = 3 * 60 * 1000;

function isEnabled() {
  return String(process.env.NEWS_CRAWL_ENABLED || 'true').toLowerCase() !== 'false';
}

async function shouldRunNow() {
  const doc = await CommunityJobState.findOne({ jobId: JOB_ID }).lean();
  if (!doc?.lastRunAt) return true;
  return Date.now() - new Date(doc.lastRunAt).getTime() >= INTERVAL_MS;
}

async function runScheduledNewsCrawl(logger) {
  if (!isEnabled()) return null;
  if (!(await shouldRunNow())) return null;

  const result = await runNewsCrawl({ logger });
  await CommunityJobState.updateOne(
    { jobId: JOB_ID },
    { $set: { lastRunAt: new Date(), lastResult: result } },
    { upsert: true },
  );
  logger?.info?.('news_crawl_completed', result);
  return result;
}

/**
 * Kiểm tra mỗi giờ; chạy crawl nếu đã qua 24h kể từ lần trước (hoặc chưa từng chạy).
 */
function startNewsCrawlScheduler(logger) {
  if (!isEnabled()) {
    logger?.info?.('news_crawl_scheduler_disabled');
    return;
  }

  const tick = () => {
    runScheduledNewsCrawl(logger).catch((err) => {
      logger?.error?.('news_crawl_scheduler_failed', { error: err?.message || String(err) });
    });
  };

  setTimeout(tick, STARTUP_DELAY_MS);
  setInterval(tick, CHECK_MS);
  logger?.info?.('news_crawl_scheduler_started', {
    intervalHours: INTERVAL_MS / 3600000,
    checkHours: CHECK_MS / 3600000,
  });
}

module.exports = {
  startNewsCrawlScheduler,
  runScheduledNewsCrawl,
  JOB_ID,
  INTERVAL_MS,
};
