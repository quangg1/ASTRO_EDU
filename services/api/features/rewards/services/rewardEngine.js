const LearningPathEvent = require('../../learning-path/models/LearningPathEvent');
const UserProgress = require('../../learning-path/models/UserProgress');
const UserReward = require('../models/UserReward');
const GemTransaction = require('../models/GemTransaction');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const { DWELL_SEC_MIN, DH_BEAT_DWELL_SEC_MIN, DH_MAX_BEAT_REWARDS_PER_SESSION, DH_EARN_REASONS, GEM_EARN, depthGemsMap } = require('../constants/gemEarn');
const { getCachedSeasonalMultiplier, getWeeklyDeepHistoryCap, scaleEarn } = require('./gemRuntimeConfigService');
const { handleLearnerTierProgression } = require('./learnerTierService');

const DEPTH_GEMS = depthGemsMap();

function computeLevel(totalGemsEarned) {
  const t = Math.max(0, Number(totalGemsEarned) || 0);
  return Math.max(1, Math.min(50, Math.floor(Math.sqrt(t / 25)) + 1));
}

function utcDayBounds(d) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth();
  const day = x.getUTCDate();
  const start = new Date(Date.UTC(y, m, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, day + 1, 0, 0, 0, 0));
  return { start, end, key: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

async function applyGemEarn(userId, amount, txBase) {
  if (!amount || amount <= 0) return null;
  const prev = await UserReward.findOne({ userId }).lean();
  const prevTotal = prev?.totalGemsEarned ?? 0;
  const prevLevel = computeLevel(prevTotal);
  const updated = await UserReward.findOneAndUpdate(
    { userId },
    {
      $inc: { gemBalance: amount, totalGemsEarned: amount },
      $setOnInsert: {
        userId,
        streakShields: 0,
        lastStreakDay: '',
        streakDays: 0,
        level: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  const nextTotal = updated.totalGemsEarned ?? 0;
  const nextLevel = computeLevel(nextTotal);
  const levelUp = nextLevel > prevLevel;
  if (nextLevel !== (updated.level ?? 1)) {
    await UserReward.updateOne({ userId }, { $set: { level: nextLevel } });
  }
  void handleLearnerTierProgression(userId, prevTotal, nextTotal).catch((err) => {
    console.error('[rewards] learner tier progression failed:', err?.message || err);
  });
  await GemTransaction.create({
    ...txBase,
    userId,
    delta: amount,
    balanceAfter: updated.gemBalance,
  });
  return { updated, levelUp, prevLevel, nextLevel };
}

async function updateStreak(userId, rewardDoc) {
  const { key } = utcDayBounds(new Date());
  const last = String(rewardDoc?.lastStreakDay || '');
  if (last === key) {
    return { streakDays: rewardDoc.streakDays ?? 0, bumped: false };
  }
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yKey = utcDayBounds(yesterday).key;
  let nextStreak = 1;
  if (last === yKey) nextStreak = (rewardDoc.streakDays ?? 0) + 1;
  await UserReward.updateOne({ userId }, { $set: { lastStreakDay: key, streakDays: nextStreak } });
  return { streakDays: nextStreak, bumped: true };
}

async function countCriteria(userId, type) {
  if (type === 'depth_researcher_count') {
    return GemTransaction.countDocuments({ userId, reason: 'depth_complete', depth: 'researcher' });
  }
  if (type === 'scene_discovery_count') {
    return GemTransaction.countDocuments({ userId, reason: 'scene_entity_discovered' });
  }
  if (type === 'lesson_complete_dwell_count') {
    return GemTransaction.countDocuments({ userId, reason: 'lp_complete_dwell' });
  }
  if (type === 'total_gems') {
    const u = await UserReward.findOne({ userId }).select('totalGemsEarned').lean();
    return u?.totalGemsEarned ?? 0;
  }
  if (type === 'streak_days') {
    const u = await UserReward.findOne({ userId }).select('streakDays').lean();
    return u?.streakDays ?? 0;
  }
  return 0;
}

async function checkAchievements(userId) {
  const existing = await UserAchievement.find({ userId }).select('achievementSlug').lean();
  const have = new Set(existing.map((x) => x.achievementSlug));
  const catalog = await Achievement.find({}).lean();
  const unlocked = [];
  for (const a of catalog) {
    if (have.has(a.slug)) continue;
    const ct = a.criteriaType || '';
    if (!ct) continue;
    const val = await countCriteria(userId, ct);
    if (val >= (a.criteriaThreshold || 0)) {
      await UserAchievement.create({ userId, achievementSlug: a.slug });
      unlocked.push({ slug: a.slug, titleVi: a.titleVi, descriptionVi: a.descriptionVi || '' });
      have.add(a.slug);
    }
  }
  return unlocked;
}

async function findOpenTimestamp(userId, lessonId, sessionId, beforeTs) {
  if (!lessonId || !sessionId) return null;
  const row = await LearningPathEvent.findOne({
    userId,
    lessonId,
    sessionId,
    eventName: 'lp_lesson_opened',
    timestamp: { $lt: beforeTs },
  })
    .sort({ timestamp: -1 })
    .select('timestamp')
    .lean();
  return row?.timestamp || null;
}

async function lessonDwellRewardedToday(userId, lessonId) {
  const { start, end } = utcDayBounds(new Date());
  const c = await GemTransaction.countDocuments({
    userId,
    lessonId,
    reason: 'lp_complete_dwell',
    createdAt: { $gte: start, $lt: end },
  });
  return c > 0;
}

async function hasDepthComplete(userId, lessonId, depth) {
  if (!depth) return true;
  const c = await GemTransaction.countDocuments({
    userId,
    lessonId,
    depth,
    reason: 'depth_complete',
  });
  return c > 0;
}

async function sceneDiscoveryRewarded(userId, entityId) {
  const c = await GemTransaction.countDocuments({
    userId,
    entityId,
    reason: 'scene_entity_discovered',
  });
  return c > 0;
}

const { startOfCalendarDayVi } = require('../../../shared/calendarDayKey');

async function contextualQuizPassedRewardedToday(userId, entityId) {
  const since = startOfCalendarDayVi();
  const c = await GemTransaction.countDocuments({
    userId,
    entityId,
    reason: 'scene_contextual_quiz_passed',
    createdAt: { $gte: since },
  });
  return c > 0;
}

async function deepHistoryGemsEarnedThisWeek(userId) {
  const since = new Date(Date.now() - 7 * 86400_000);
  const agg = await GemTransaction.aggregate([
    {
      $match: {
        userId,
        reason: { $in: [...DH_EARN_REASONS] },
        createdAt: { $gte: since },
        delta: { $gt: 0 },
      },
    },
    { $group: { _id: null, total: { $sum: '$delta' } } },
  ]);
  return Number(agg[0]?.total) || 0;
}

async function deepHistoryBeatRewardsInSession(userId, sessionId) {
  if (!sessionId) return DH_MAX_BEAT_REWARDS_PER_SESSION;
  return GemTransaction.countDocuments({
    userId,
    sessionId,
    reason: 'dh_beat_dwell',
  });
}

async function deepHistoryBeatRewarded(userId, entityId, beatId) {
  return GemTransaction.exists({
    userId,
    entityId,
    reason: 'dh_beat_dwell',
    'metadata.beatId': beatId,
  });
}

async function deepHistorySiteRewarded(userId, entityId, siteId) {
  return GemTransaction.exists({
    userId,
    entityId,
    reason: 'dh_site_opened',
    'metadata.siteId': siteId,
  });
}

/**
 * @returns {Promise<null|{ gemsEarned: number, newBalance: number, levelUp: boolean, newAchievements: any[], streakResult: any, label: string }>}
 */
async function processLearningPathRewardEvent(userId, ev) {
  if (!userId || !ev) return null;

  const seasonalMult = await getCachedSeasonalMultiplier();

  if (ev.eventName === 'lp_lesson_completed_toggled' && ev.completed === true && ev.lessonId) {
    const lessonId = String(ev.lessonId);
    const sessionId = String(ev.sessionId || '');
    const depth = ev.depth && DEPTH_GEMS[ev.depth] != null ? ev.depth : null;
    const openedAt = await findOpenTimestamp(userId, lessonId, sessionId, ev.timestamp);
    let dwellSec = 0;
    if (openedAt) dwellSec = (ev.timestamp.getTime() - new Date(openedAt).getTime()) / 1000;

    let total = 0;
    const parts = [];
    const labels = [];

    if (dwellSec >= DWELL_SEC_MIN) {
      const already = await lessonDwellRewardedToday(userId, lessonId);
      if (!already) {
        total += GEM_EARN.lp_complete_dwell;
        parts.push('complete_lesson');
        labels.push('Hoàn thành bài (đủ thời gian đọc)');
      }
    }

    if (depth) {
      const hadDepth = await hasDepthComplete(userId, lessonId, depth);
      if (!hadDepth) {
        total += DEPTH_GEMS[depth];
        parts.push(`depth_${depth}`);
        labels.push(`Độ sâu ${depth}`);
      }
    }

    if (total <= 0) return null;

    let gemsEarned = 0;
    let agg = null;
    let levelUpAny = false;
    if (parts.includes('complete_lesson')) {
      const amt = scaleEarn(GEM_EARN.lp_complete_dwell, seasonalMult);
      gemsEarned += amt;
      agg = await applyGemEarn(userId, amt, {
        reason: 'lp_complete_dwell',
        lessonId,
        nodeId: ev.nodeId || null,
        depth,
        sessionId: sessionId || null,
        metadata: { dwellSec, seasonalMultiplier: seasonalMult },
      });
      if (agg?.levelUp) levelUpAny = true;
    }
    if (depth && parts.includes(`depth_${depth}`)) {
      const baseDepth = DEPTH_GEMS[depth];
      const amt = scaleEarn(baseDepth, seasonalMult);
      gemsEarned += amt;
      const r2 = await applyGemEarn(userId, amt, {
        reason: 'depth_complete',
        lessonId,
        nodeId: ev.nodeId || null,
        depth,
        sessionId: sessionId || null,
        metadata: { seasonalMultiplier: seasonalMult },
      });
      if (r2) {
        agg = r2;
        if (r2.levelUp) levelUpAny = true;
      }
    }

    const urAfter = await UserReward.findOne({ userId }).lean();
    const streakResult = await updateStreak(userId, urAfter);
    const newAchievements = await checkAchievements(userId);
    return {
      gemsEarned,
      newBalance: urAfter?.gemBalance ?? agg?.updated?.gemBalance ?? 0,
      levelUp: levelUpAny,
      newAchievements,
      streakResult,
      label: labels.join(' · ') || 'Lộ trình',
    };
  }

  if (ev.eventName === 'lp_lesson_mastered' && ev.lessonId) {
    const lessonId = String(ev.lessonId);
    const meta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
    const firstRecall = meta.firstRecallPass !== false;
    let base = firstRecall ? GEM_EARN.recall_quiz_first : GEM_EARN.recall_quiz_retry;
    if (firstRecall) {
      const existed = await GemTransaction.exists({ userId, lessonId, reason: 'recall_quiz_first' });
      if (existed) base = GEM_EARN.recall_quiz_retry;
    }
    const gems = scaleEarn(base, seasonalMult);
    const reason = base === GEM_EARN.recall_quiz_first ? 'recall_quiz_first' : 'recall_quiz_retry';
    const agg = await applyGemEarn(userId, gems, {
      reason,
      lessonId,
      nodeId: ev.nodeId || null,
      depth: ev.depth || null,
      sessionId: ev.sessionId || null,
      metadata: { firstRecall, seasonalMultiplier: seasonalMult },
    });
    if (!agg) return null;
    const urAfter = await UserReward.findOne({ userId }).lean();
    const streakResult = await updateStreak(userId, urAfter);
    const newAchievements = await checkAchievements(userId);
    return {
      gemsEarned: gems,
      newBalance: agg.updated.gemBalance,
      levelUp: agg.levelUp,
      newAchievements,
      streakResult,
      label: reason === 'recall_quiz_first' ? 'Quiz nhớ — lần đầu đạt' : 'Quiz nhớ — ôn lại đạt',
    };
  }

  if (ev.eventName === 'scene_entity_discovered') {
    const meta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
    const entityId = String(meta.entityId || '').trim();
    if (!entityId) return null;

    const up = await UserProgress.findOne({ userId }).select('learningPathCompletedLessonIds').lean();
    const completed = up?.learningPathCompletedLessonIds || [];
    if (!Array.isArray(completed) || completed.length < 1) return null;

    const rewarded = await sceneDiscoveryRewarded(userId, entityId);
    if (rewarded) return null;

    const amt = scaleEarn(GEM_EARN.scene_entity_discovered, seasonalMult);
    const agg = await applyGemEarn(userId, amt, {
      reason: 'scene_entity_discovered',
      entityId,
      sessionId: ev.sessionId || null,
      metadata: { rarity: meta.rarity || null, seasonalMultiplier: seasonalMult },
    });
    if (!agg) return null;
    const urAfter = await UserReward.findOne({ userId }).lean();
    const streakResult = await updateStreak(userId, urAfter);
    const newAchievements = await checkAchievements(userId);
    return {
      gemsEarned: amt,
      newBalance: agg.updated.gemBalance,
      levelUp: agg.levelUp,
      newAchievements,
      streakResult,
      label: 'Khám phá 3D',
    };
  }

  if (ev.eventName === 'scene_contextual_quiz_passed') {
    const meta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
    const entityId = String(meta.entityId || '').trim();
    const correctCount = Number(meta.correctCount ?? 0);
    const totalCount = Number(meta.totalCount ?? 0);
    if (!entityId || totalCount < 1 || correctCount < totalCount) return null;

    const up = await UserProgress.findOne({ userId }).select('learningPathCompletedLessonIds').lean();
    const completed = up?.learningPathCompletedLessonIds || [];
    if (!Array.isArray(completed) || completed.length < 1) return null;

    if (await contextualQuizPassedRewardedToday(userId, entityId)) return null;

    const amt = scaleEarn(GEM_EARN.scene_contextual_quiz_passed, seasonalMult);
    const agg = await applyGemEarn(userId, amt, {
      reason: 'scene_contextual_quiz_passed',
      entityId,
      sessionId: ev.sessionId || null,
      metadata: { correctCount, totalCount, seasonalMultiplier: seasonalMult },
    });
    if (!agg) return null;
    const urAfter = await UserReward.findOne({ userId }).lean();
    const streakResult = await updateStreak(userId, urAfter);
    const newAchievements = await checkAchievements(userId);
    return {
      gemsEarned: amt,
      newBalance: agg.updated.gemBalance,
      levelUp: agg.levelUp,
      newAchievements,
      streakResult,
      label: 'Quiz ngữ cảnh Explore',
    };
  }

  if (ev.eventName === 'deep_history_beat_dwell') {
    const meta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
    const entityId = String(meta.entityId || '').trim();
    const beatId = Number(meta.beatId);
    const dwellSec = Number(meta.dwellSec ?? ev.durationSec ?? 0);
    const sessionId = String(ev.sessionId || '');
    if (!entityId || !Number.isFinite(beatId)) return null;
    if (dwellSec < DH_BEAT_DWELL_SEC_MIN) return null;

    const beatSessionCount = await deepHistoryBeatRewardsInSession(userId, sessionId);
    if (beatSessionCount >= DH_MAX_BEAT_REWARDS_PER_SESSION) return null;
    if (await deepHistoryBeatRewarded(userId, entityId, beatId)) return null;

    const weeklyCap = await getWeeklyDeepHistoryCap();
    const earnedWeek = await deepHistoryGemsEarnedThisWeek(userId);
    const amt = scaleEarn(GEM_EARN.dh_beat_dwell, seasonalMult);
    if (amt <= 0 || earnedWeek + amt > weeklyCap) return null;

    const agg = await applyGemEarn(userId, amt, {
      reason: 'dh_beat_dwell',
      entityId,
      sessionId: sessionId || null,
      metadata: { beatId, dwellSec, seasonalMultiplier: seasonalMult },
    });
    if (!agg) return null;
    const urAfter = await UserReward.findOne({ userId }).lean();
    const streakResult = await updateStreak(userId, urAfter);
    const newAchievements = await checkAchievements(userId);
    return {
      gemsEarned: amt,
      newBalance: agg.updated.gemBalance,
      levelUp: agg.levelUp,
      newAchievements,
      streakResult,
      label: 'Deep History — xem giai đoạn',
    };
  }

  if (ev.eventName === 'deep_history_site_opened') {
    const meta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
    const entityId = String(meta.entityId || '').trim();
    const siteId = String(meta.siteId || '').trim();
    const sessionId = String(ev.sessionId || '');
    if (!entityId || !siteId) return null;
    if (await deepHistorySiteRewarded(userId, entityId, siteId)) return null;

    const weeklyCap = await getWeeklyDeepHistoryCap();
    const earnedWeek = await deepHistoryGemsEarnedThisWeek(userId);
    const amt = scaleEarn(GEM_EARN.dh_site_opened, seasonalMult);
    if (amt <= 0 || earnedWeek + amt > weeklyCap) return null;

    const agg = await applyGemEarn(userId, amt, {
      reason: 'dh_site_opened',
      entityId,
      sessionId: sessionId || null,
      metadata: { siteId, seasonalMultiplier: seasonalMult },
    });
    if (!agg) return null;
    const urAfter = await UserReward.findOne({ userId }).lean();
    const streakResult = await updateStreak(userId, urAfter);
    const newAchievements = await checkAchievements(userId);
    return {
      gemsEarned: amt,
      newBalance: agg.updated.gemBalance,
      levelUp: agg.levelUp,
      newAchievements,
      streakResult,
      label: 'Deep History — mở điểm',
    };
  }

  return null;
}

/**
 * Gộp nhiều segment từ một batch (toast tổng + cờ level/achievement).
 */
function mergeRewardSegments(segments) {
  const gemsEarned = segments.reduce((s, x) => s + (x.gemsEarned || 0), 0);
  const levelUp = segments.some((x) => x.levelUp);
  const newAchievements = [];
  const seen = new Set();
  for (const x of segments) {
    for (const a of x.newAchievements || []) {
      if (!seen.has(a.slug)) {
        seen.add(a.slug);
        newAchievements.push(a);
      }
    }
  }
  const lastBalance = segments.length ? segments[segments.length - 1].newBalance : null;
  const labels = segments.map((x) => x.label).filter(Boolean);
  return {
    gemsEarned,
    newBalance: lastBalance,
    levelUp,
    newAchievements,
    streakResult: segments[segments.length - 1]?.streakResult ?? null,
    labels,
    segments,
  };
}

module.exports = {
  computeLevel,
  utcDayBounds,
  applyGemEarn,
  processLearningPathRewardEvent,
  mergeRewardSegments,
};
