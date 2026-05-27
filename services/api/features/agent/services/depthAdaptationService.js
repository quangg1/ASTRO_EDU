const LearnerAgentProfile = require('../models/LearnerAgentProfile');
const { detectWeakLessons } = require('./struggleDetector');

const DEPTH_ORDER = ['beginner', 'explorer', 'researcher'];

function nextDepth(current) {
  const i = DEPTH_ORDER.indexOf(current);
  if (i < 0 || i >= DEPTH_ORDER.length - 1) return null;
  return DEPTH_ORDER[i + 1];
}

function prevDepth(current) {
  const i = DEPTH_ORDER.indexOf(current);
  if (i <= 0) return null;
  return DEPTH_ORDER[i - 1];
}

/**
 * Gợi ý đổi depth — user phải xác nhận (không auto-set).
 * @param {string} userId
 * @param {{ lessonId?: string, currentDepth?: string }} ctx
 */
async function evaluateDepthSuggestion(userId, ctx = {}) {
  if (!userId) return null;
  const current = String(ctx.currentDepth || 'beginner').toLowerCase();
  if (!DEPTH_ORDER.includes(current)) return null;

  const [profile, weak] = await Promise.all([
    LearnerAgentProfile.findOne({ userId }).select('depthPrefs').lean(),
    detectWeakLessons(userId, { lessonId: ctx.lessonId }),
  ]);

  const lessonId = ctx.lessonId ? String(ctx.lessonId) : '';
  const top = weak[0];
  const onThisLesson = top?.lessonId === lessonId;

  if (onThisLesson && top?.signals?.includes('quiz_fail_streak')) {
    const easier = prevDepth(current);
    if (easier) {
      return {
        suggestedDepth: easier,
        reason: 'Bạn gặp khó với quiz ở mức này — thử mức giải thích nhẹ hơn?',
        confidence: 'medium',
      };
    }
  }

  if (onThisLesson && top?.signals?.includes('high_dwell') && !top?.signals?.includes('quiz_fail_streak')) {
    const harder = nextDepth(current);
    if (harder) {
      return {
        suggestedDepth: harder,
        reason: 'Bạn dành nhiều thời gian cho bài — có thể thử mức sâu hơn khi đã sẵn sàng.',
        confidence: 'low',
      };
    }
  }

  const preferred = profile?.depthPrefs?.preferredDepth;
  if (preferred && preferred !== current && DEPTH_ORDER.includes(preferred)) {
    return {
      suggestedDepth: preferred,
      reason: 'Bạn thường học hiệu quả hơn ở mức depth này.',
      confidence: 'low',
    };
  }

  return null;
}

async function recordDepthPreference(userId, depth) {
  const d = String(depth || '').toLowerCase();
  if (!DEPTH_ORDER.includes(d) || !userId) return;
  await LearnerAgentProfile.findOneAndUpdate(
    { userId },
    { $set: { 'depthPrefs.preferredDepth': d, 'depthPrefs.updatedAt': new Date() } },
    { upsert: true },
  );
}

module.exports = { evaluateDepthSuggestion, recordDepthPreference, DEPTH_ORDER };
