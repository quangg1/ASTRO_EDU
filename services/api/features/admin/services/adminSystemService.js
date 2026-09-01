/* eslint-disable no-restricted-imports -- Admin read-model: cross-feature aggregates for ops console. */
const mongoose = require('mongoose');
const CommunityJobState = require('../../community/models/CommunityJobState');
const { runScheduledNewsCrawl, JOB_ID, INTERVAL_MS } = require('../../community/jobs/newsCrawlScheduler');
const { isMailConfigured } = require('../../../shared/mailer');
const { recordAdminAction } = require('../lib/recordAdminAction');
const SecurityAuditLog = require('../../security/models/SecurityAuditLog');

async function getAdminSystemStatus() {
  const dbOk = mongoose.connection.readyState === 1;
  const job = await CommunityJobState.findOne({ jobId: JOB_ID }).lean();
  const newsCrawlEnabled = String(process.env.NEWS_CRAWL_ENABLED || 'true').toLowerCase() !== 'false';

  let securityEvents24h = 0;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    securityEvents24h = await SecurityAuditLog.countDocuments({ createdAt: { $gte: since } });
  } catch {
    securityEvents24h = 0;
  }

  const lastRunAt = job?.lastRunAt ? new Date(job.lastRunAt).toISOString() : null;
  const nextDueAt =
    lastRunAt && newsCrawlEnabled
      ? new Date(new Date(lastRunAt).getTime() + INTERVAL_MS).toISOString()
      : null;

  return {
    api: { ok: true, timestamp: new Date().toISOString() },
    database: { ok: dbOk, readyState: mongoose.connection.readyState },
    smtp: { configured: isMailConfigured() },
    newsCrawl: {
      enabled: newsCrawlEnabled,
      jobId: JOB_ID,
      intervalHours: INTERVAL_MS / 3600000,
      lastRunAt,
      lastResult: job?.lastResult || null,
      nextDueAt,
    },
    security: { eventsLast24h: securityEvents24h },
  };
}

async function triggerAdminNewsCrawl({ actorUserId, reason }) {
  const result = await runScheduledNewsCrawl({ info: () => {}, error: () => {} });
  await recordAdminAction({
    actorUserId,
    action: 'news_crawl_trigger',
    targetType: 'system',
    targetId: JOB_ID,
    reason: reason || 'Admin kích hoạt crawl tin thủ công',
    payload: { result },
  });
  const job = await CommunityJobState.findOne({ jobId: JOB_ID }).lean();
  return { result, lastRunAt: job?.lastRunAt || null, lastResult: job?.lastResult || null };
}

module.exports = { getAdminSystemStatus, triggerAdminNewsCrawl };
