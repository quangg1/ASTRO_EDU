const LearnerAgentProfile = require('../models/LearnerAgentProfile');
const { detectWeakLessons } = require('./struggleDetector');

const POLICY = {
  triggers: {
    dwellThresholdMs: 480_000,
    quizFailStreak: 2,
    revisitCount: 3,
  },
  cooldown: {
    sameLessonMs: 3_600_000,
    globalMs: 1_800_000,
    afterDismissMs: 7_200_000,
  },
  maxPerSession: 2,
};

/**
 * @param {string} userId
 * @param {{ lessonId?: string, sessionId?: string }} ctx
 */
async function evaluateCoachNudge(userId, ctx = {}) {
  if (!userId) return { allowed: false, reason: 'no_user' };

  const profile =
    (await LearnerAgentProfile.findOne({ userId })) ||
    (await LearnerAgentProfile.create({ userId }));

  const now = Date.now();
  if (profile.coach?.dismissUntil && new Date(profile.coach.dismissUntil).getTime() > now) {
    return { allowed: false, reason: 'dismissed' };
  }
  if (profile.coach?.lastCoachAt) {
    const last = new Date(profile.coach.lastCoachAt).getTime();
    if (now - last < POLICY.cooldown.globalMs) {
      return { allowed: false, reason: 'global_cooldown' };
    }
  }
  if ((profile.coach?.sessionCoachCount || 0) >= POLICY.maxPerSession) {
    return { allowed: false, reason: 'session_cap' };
  }

  const weak = await detectWeakLessons(userId, { lessonId: ctx.lessonId });
  if (!weak.length) return { allowed: false, reason: 'no_signals' };

  const top = weak[0];
  const lessonId = ctx.lessonId || top.lessonId;

  if (lessonId && profile.coach?.lastCoachAt && profile.coach?.lastLessonId === lessonId) {
    const last = new Date(profile.coach.lastCoachAt).getTime();
    if (now - last < POLICY.cooldown.sameLessonMs) {
      return { allowed: false, reason: 'lesson_cooldown' };
    }
  }

  const variant = coachVariantForUser(userId);
  const message = buildCoachMessage(top, variant);
  const chips = buildCoachChips(weak, lessonId);

  profile.coach = profile.coach || {};
  profile.coach.sessionCoachCount = (profile.coach.sessionCoachCount || 0) + 1;
  profile.coach.lastCoachAt = new Date();
  profile.coach.lastLessonId = lessonId;
  await profile.save();

  return {
    allowed: true,
    message,
    chips,
    weakLessons: weak,
    lessonId,
    copyVariant: variant,
  };
}

const COACH_COPY = {
  a: {
    quiz_fail_streak:
      'Bạn vừa gặp khó với câu hỏi ôn tập. Thử hỏi trợ lý theo hướng gợi mở — không cần nhớ đáp án ngay.',
    high_dwell: 'Có vẻ bài này đang hơi khó. Bạn muốn giải thích ngắn hoặc xem bài liên quan?',
    frequent_revisit:
      'Bạn đã quay lại bài này vài lần. Ôn lại khái niệm chính hoặc hỏi trợ lý có thể giúp.',
    default: 'Trợ lý có thể giúp bạn nắm bài này rõ hơn.',
  },
  b: {
    quiz_fail_streak:
      'Quiz vừa rồi hơi khó — mở trợ lý để được gợi ý từng bước (không spoil đáp án).',
    high_dwell: 'Bạn đang ở lại bài khá lâu. Hỏi trợ lý giải thích phần đang đọc?',
    frequent_revisit: 'Bạn hay quay lại bài này — ôn nhanh hoặc hỏi trợ lý một câu cụ thể.',
    default: 'Cần giải thích thêm? Trợ lý biết bạn đang học bài này.',
  },
};

function coachVariantForUser(userId) {
  if (!userId) return 'a';
  let h = 0;
  for (let i = 0; i < userId.length; i += 1) h = (h * 31 + userId.charCodeAt(i)) % 2;
  return h === 0 ? 'a' : 'b';
}

function buildCoachMessage(weak, variant = 'a') {
  const copy = COACH_COPY[variant] || COACH_COPY.a;
  if (weak.signals.includes('quiz_fail_streak')) return copy.quiz_fail_streak;
  if (weak.signals.includes('high_dwell')) return copy.high_dwell;
  if (weak.signals.includes('frequent_revisit')) return copy.frequent_revisit;
  return copy.default;
}

function buildCoachChips(weak, focusLessonId) {
  const chips = [
    { label: 'Hỏi trợ lý (gợi mở)', action: 'open_agent' },
    { label: 'Ôn lại bài này', action: 'review_lesson', lessonId: focusLessonId },
  ];
  if (weak.length > 1 && weak[1].lessonId) {
    chips.push({
      label: 'Xem bài liên quan',
      action: 'related_lesson',
      lessonId: weak[1].lessonId,
    });
  }
  chips.push({ label: 'Để sau', action: 'dismiss' });
  return chips;
}

async function dismissCoach(userId) {
  if (!userId) return;
  await LearnerAgentProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        'coach.dismissUntil': new Date(Date.now() + POLICY.cooldown.afterDismissMs),
        'coach.lastDismissAt': new Date(),
      },
    },
    { upsert: true },
  );
}

async function recordQuizOutcome(userId, { lessonId, passed, misconceptionTag }) {
  if (!userId || !lessonId) return;
  if (passed) {
    const { markLessonMasteredForSpaced } = require('./spacedReviewService');
    await markLessonMasteredForSpaced(userId, lessonId);
  }
  const profile = await LearnerAgentProfile.findOne({ userId });
  const coach = profile?.coach || {};
  const map = { ...(coach.quizFailStreakByLesson || {}) };
  const lid = String(lessonId).trim();

  if (passed) {
    map[lid] = 0;
  } else {
    map[lid] = (Number(map[lid]) || 0) + 1;
  }

  const update = {
    'coach.quizFailStreakByLesson': map,
  };

  if (!passed && misconceptionTag) {
    const tag = String(misconceptionTag).trim().slice(0, 120);
    if (tag) {
      await LearnerAgentProfile.findOneAndUpdate(
        { userId },
        {
          $set: update,
          $push: {
            misconceptions: {
              lessonId: lid,
              tag,
              source: 'quiz_clarify',
              count: 1,
              lastAt: new Date(),
            },
          },
        },
        { upsert: true },
      );
      return;
    }
  }

  await LearnerAgentProfile.findOneAndUpdate({ userId }, { $set: update }, { upsert: true });
}

module.exports = {
  evaluateCoachNudge,
  dismissCoach,
  recordQuizOutcome,
  POLICY,
};
