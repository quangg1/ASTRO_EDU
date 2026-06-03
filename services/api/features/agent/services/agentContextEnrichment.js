const UserProgress = require('../../learning-path/models/UserProgress');
const CohortEnrollment = require('../../courses/models/CohortEnrollment');
const Cohort = require('../../courses/models/Cohort');
const Course = require('../../courses/models/Course');
const CohortActivitySchedule = require('../../courses/models/CohortActivitySchedule');
const CohortAnnouncement = require('../../courses/models/CohortAnnouncement');
const AssignmentSubmission = require('../../courses/models/AssignmentSubmission');
const {
  loadScheduleMap,
  effectiveSchedule,
  computeAccess,
} = require('../../courses/services/scheduleResolver');
const Concept = require('../../concepts/models/Concept');
const UserReward = require('../../rewards/models/UserReward');
const ShopItem = require('../../rewards/models/ShopItem');
const ShowcaseUnlock = require('../../rewards/models/ShowcaseUnlock');
const { getWalletLearnerMeta } = require('../../rewards/services/learnerTierService');
const { GEM_SPEND_SHOWCASE } = require('../../rewards/constants/gemEarn');
const Post = require('../../community/models/Post');
const Forum = require('../../community/models/Forum');
const { isNewsForum } = require('../../community/constants/forumCatalog');
const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');

const DEADLINE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const ANNOUNCEMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const STUDIO_RESERVED = new Set(['showcase-entities', 'learning-path', 'concepts']);

function extractBeatConfidence(beat) {
  if (!beat || typeof beat !== 'object') return null;
  const env = beat.environment;
  if (env && typeof env === 'object' && env.confidence) {
    return String(env.confidence).toLowerCase();
  }
  if (beat.confidence) return String(beat.confidence).toLowerCase();
  return null;
}

function confidenceDisclaimerVi(confidence) {
  const c = String(confidence || '').toLowerCase();
  if (c === 'consensus') {
    return 'Độ tin cậy khoa học: consensus — có thể trình bày tự tin hơn nhưng vẫn nêu nguồn khi cần.';
  }
  if (c === 'model') {
    return 'Độ tin cậy: model — nhấn mạnh đây là mô hình/giả thuyết, không khẳng định như số đo trực tiếp.';
  }
  if (c === 'estimate' || c === 'hypothesis') {
    return 'Độ tin cậy: ước lượng/hypothesis — nói rõ giới hạn và không gán nhầm thành consensus.';
  }
  return null;
}

/**
 * @param {string|null} userId
 * @param {Record<string, unknown>|null} sessionContext
 */
async function buildCohortContext(userId, sessionContext) {
  if (!userId) return null;

  const enrollments = await CohortEnrollment.find({ userId }).lean();
  if (!enrollments.length) return null;

  const cohortIds = enrollments.map((e) => e.cohortId);
  const cohorts = await Cohort.find({ _id: { $in: cohortIds }, status: { $ne: 'closed' } }).lean();
  if (!cohorts.length) return null;

  const courseSlugHint =
    typeof sessionContext?.courseSlug === 'string' ? sessionContext.courseSlug.trim() : '';

  let primary = cohorts[0];
  if (courseSlugHint) {
    const courseDoc = await Course.findOne({ slug: courseSlugHint }).select('_id').lean();
    if (courseDoc) {
      const match = cohorts.find((c) => String(c.courseId) === String(courseDoc._id));
      if (match) primary = match;
    }
  }

  const course = await Course.findById(primary.courseId).select('slug title lessons').lean();
  if (!course) return null;

  const scheduleByLessonSlug = await loadScheduleMap(CohortActivitySchedule, primary._id);
  const now = new Date();
  const nowMs = now.getTime();

  const subs = await AssignmentSubmission.find({
    userId,
    courseId: course._id,
    cohortId: primary._id,
  }).lean();
  const subByLesson = Object.fromEntries(subs.map((s) => [s.lessonSlug, s]));

  const upcomingDeadlines = [];
  let pendingAssignments = 0;

  for (const lesson of course.lessons || []) {
    const type = lesson.type || 'text';
    const schedule = effectiveSchedule(lesson, scheduleByLessonSlug);
    const dueAt = schedule.dueAt ? new Date(schedule.dueAt) : null;
    const access = computeAccess(schedule, now);

    if (type === 'assignment') {
      const sub = subByLesson[lesson.slug];
      const done = sub && ['submitted', 'graded'].includes(sub.status);
      if (!done && access === 'open') pendingAssignments += 1;
      if (
        dueAt &&
        dueAt.getTime() >= nowMs &&
        dueAt.getTime() <= nowMs + DEADLINE_WINDOW_MS
      ) {
        upcomingDeadlines.push({
          lessonSlug: lesson.slug,
          title: lesson.title,
          type,
          dueAt: dueAt.toISOString(),
          access,
          pending: !done,
        });
      }
    } else if (type === 'quiz' && dueAt) {
      if (
        dueAt.getTime() >= nowMs &&
        dueAt.getTime() <= nowMs + DEADLINE_WINDOW_MS &&
        access === 'open'
      ) {
        upcomingDeadlines.push({
          lessonSlug: lesson.slug,
          title: lesson.title,
          type,
          dueAt: dueAt.toISOString(),
          access,
          pending: false,
        });
      }
    }
  }

  upcomingDeadlines.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const announcementSince = new Date(nowMs - ANNOUNCEMENT_WINDOW_MS);
  const recentAnnouncements = await CohortAnnouncement.countDocuments({
    cohortId: primary._id,
    createdAt: { $gte: announcementSince },
  });

  return {
    cohortId: String(primary._id),
    cohortTitle: primary.title,
    courseSlug: course.slug,
    courseTitle: course.title,
    pendingAssignments,
    recentAnnouncements,
    upcomingDeadlines: upcomingDeadlines.slice(0, 6),
  };
}

/**
 * @param {string|null} userId
 * @param {Record<string, unknown>|null} sessionContext
 */
async function buildConceptGraphCtx(userId, sessionContext) {
  const lessonId =
    typeof sessionContext?.lessonId === 'string' ? sessionContext.lessonId.trim() : '';
  const { byId, concepts: lpConcepts } = await getLearningPathLessonIndex();

  let targetConceptIds = [];
  if (lessonId) {
    targetConceptIds = byId.get(lessonId)?.conceptIds || [];
  }
  if (!targetConceptIds.length) return null;

  const masteredSet = new Set();
  if (userId) {
    const progress = await UserProgress.findOne({ userId })
      .select('learningPathMasteredLessonIds')
      .lean();
    for (const lid of progress?.learningPathMasteredLessonIds || []) {
      const hit = byId.get(lid);
      for (const cid of hit?.conceptIds || []) masteredSet.add(cid);
    }
  }

  let allIds = [...new Set(targetConceptIds)];
  const firstBatch = await Concept.find({ id: { $in: allIds } })
    .select('id prerequisites')
    .lean();
  for (const c of firstBatch) {
    for (const p of c.prerequisites || []) allIds.push(String(p));
  }
  allIds = [...new Set(allIds)];

  const conceptDocs = await Concept.find({ id: { $in: allIds } })
    .select('id title prerequisites')
    .lean();
  const docById = Object.fromEntries(conceptDocs.map((c) => [c.id, c]));

  const currentConcepts = [];
  const missingPrerequisites = [];
  const frontier = [];

  for (const cid of targetConceptIds.slice(0, 4)) {
    const doc = docById[cid];
    const title = doc?.title || lpConcepts.get(cid)?.title || cid;
    const prereqs = (doc?.prerequisites || []).map(String);
    const unmet = prereqs.filter((p) => !masteredSet.has(p));
    currentConcepts.push({
      conceptId: cid,
      title,
      unmetPrerequisiteCount: unmet.length,
    });
    for (const p of unmet) {
      if (missingPrerequisites.some((m) => m.conceptId === p)) continue;
      const pdoc = docById[p];
      missingPrerequisites.push({
        conceptId: p,
        title: pdoc?.title || lpConcepts.get(p)?.title || p,
        forConceptId: cid,
      });
    }
    if (!unmet.length && !masteredSet.has(cid)) {
      frontier.push({ conceptId: cid, title });
    }
  }

  return {
    currentConcepts,
    missingPrerequisites: missingPrerequisites.slice(0, 6),
    frontier: frontier.slice(0, 4),
    masteredConceptCount: masteredSet.size,
  };
}

/**
 * @param {string|null} userId
 * @param {Record<string, unknown>|null} sessionContext
 */
async function buildLearnerEconomyCtx(userId, sessionContext) {
  if (!userId) return null;

  const ur = await UserReward.findOne({ userId }).select('gemBalance totalGemsEarned').lean();
  const balance = ur?.gemBalance ?? 0;
  const earned = ur?.totalGemsEarned ?? 0;
  const tierMeta = getWalletLearnerMeta(earned);

  const nearbyUnlocks = [];
  const entityId =
    typeof sessionContext?.entityId === 'string' ? sessionContext.entityId.trim() : '';

  if (entityId) {
    const unlocks = await ShowcaseUnlock.find({ userId, entityId }).lean();
    const hasStory = unlocks.some((u) => u.contentType === 'story');
    const hasOrbit = unlocks.some((u) => u.contentType === 'orbit');
    if (!hasStory && balance < GEM_SPEND_SHOWCASE.story) {
      const gap = GEM_SPEND_SHOWCASE.story - balance;
      if (gap > 0 && gap <= 80) {
        nearbyUnlocks.push({
          kind: 'showcase_story',
          entityId,
          costGem: GEM_SPEND_SHOWCASE.story,
          gemsNeeded: gap,
          labelVi: `Mở story showcase (còn ${gap} gem)`,
        });
      }
    }
    if (!hasOrbit && balance < GEM_SPEND_SHOWCASE.orbit) {
      const gap = GEM_SPEND_SHOWCASE.orbit - balance;
      if (gap > 0 && gap <= 80 && nearbyUnlocks.length < 2) {
        nearbyUnlocks.push({
          kind: 'showcase_orbit',
          entityId,
          costGem: GEM_SPEND_SHOWCASE.orbit,
          gemsNeeded: gap,
          labelVi: `Mở orbit showcase (còn ${gap} gem)`,
        });
      }
    }
  }

  if (nearbyUnlocks.length < 3) {
    const shopItems = await ShopItem.find({
      visible: true,
      basePriceGem: { $gt: balance, $lte: balance + 80 },
    })
      .sort({ basePriceGem: 1 })
      .limit(3 - nearbyUnlocks.length)
      .lean();
    for (const item of shopItems) {
      nearbyUnlocks.push({
        kind: 'shop',
        skuId: item.skuId,
        costGem: item.basePriceGem,
        gemsNeeded: item.basePriceGem - balance,
        labelVi: item.nameVi || item.skuId,
      });
    }
  }

  return {
    gemBalance: balance,
    totalGemsEarned: earned,
    learnerTier: {
      id: tierMeta.current?.id,
      nameVi: tierMeta.current?.nameVi,
      emoji: tierMeta.current?.emoji,
      progressPct: tierMeta.progressPct,
      gemsToNextTier: tierMeta.gemsToNext,
      nextTierNameVi: tierMeta.next?.nameVi ?? null,
    },
    nearbyUnlocks: nearbyUnlocks.slice(0, 3),
  };
}

/**
 * @param {Record<string, unknown>|null} sessionContext
 * @param {string|undefined} userRole
 */
async function buildStudioAssistContext(sessionContext, userRole) {
  if (sessionContext?.surface !== 'studio' || userRole !== 'teacher') return null;

  const pathname = String(sessionContext?.pathname || '');
  const m = pathname.match(/^\/studio\/([^/]+)/);
  const slugFromPath = m && !STUDIO_RESERVED.has(m[1]) ? m[1] : null;
  const courseSlug =
    slugFromPath ||
    (typeof sessionContext?.courseSlug === 'string' ? sessionContext.courseSlug.trim() : '');

  if (!courseSlug) {
    return {
      mode: 'studio_general',
      hints: [
        'Trợ lý studio: gợi ý cấu trúc khóa, cohort, concept anchors — không tự publish/sửa dữ liệu.',
      ],
    };
  }

  const course = await Course.findOne({ slug: courseSlug }).select('title slug lessons').lean();
  if (!course) {
    return {
      mode: 'studio_course',
      courseSlug,
      hints: ['Không tìm thấy khóa theo slug — kiểm tra URL studio.'],
    };
  }

  const lessons = course.lessons || [];
  const lessonTypes = { text: 0, quiz: 0, assignment: 0, live_session: 0, visualization: 0 };
  for (const l of lessons) {
    const t = l.type || 'text';
    lessonTypes[t] = (lessonTypes[t] || 0) + 1;
  }

  const lessonSlugMatch = pathname.match(/\/lessons\/([^/]+)/);
  let currentLesson = null;
  if (lessonSlugMatch) {
    const found = lessons.find((l) => l.slug === lessonSlugMatch[1]);
    if (found) {
      const anchors = found.conceptAnchors || found.conceptIds || [];
      currentLesson = {
        slug: found.slug,
        title: found.title,
        type: found.type || 'text',
        hasDescription: Boolean(String(found.description || '').trim()),
        conceptAnchorCount: Array.isArray(anchors) ? anchors.length : 0,
      };
    }
  }

  const hints = [
    'Hỗ trợ giáo viên: nhắc concept anchors, lịch cohort, quiz/assignment — không thay nội dung thay user.',
  ];
  if (currentLesson && currentLesson.conceptAnchorCount === 0) {
    hints.push('Bài đang mở chưa có concept anchor — gợi ý gắn ít nhất 1 concept.');
  }
  if (lessonTypes.assignment === 0 && lessons.length > 3) {
    hints.push('Khóa chưa có bài assignment — có thể gợi ý thêm nếu cohort cần nộp bài.');
  }

  return {
    mode: 'studio_course',
    courseSlug: course.slug,
    courseTitle: course.title,
    lessonCount: lessons.length,
    lessonTypes,
    currentLesson,
    pathname,
    hints,
  };
}

/**
 * @param {{ lessonId?: string, lessonSlug?: string, courseSlug?: string, limit?: number }} opts
 */
async function searchCommunityThreadsForAgent(opts = {}) {
  const q = typeof opts.q === 'string' ? opts.q.trim() : '';
  if (q.length >= 2) {
    const { searchCommunityByQueryForAgent } = require('./contentSearchService');
    return searchCommunityByQueryForAgent({ q, limit: opts.limit });
  }

  const limit = Math.min(5, Math.max(1, opts.limit || 3));
  const forums = await Forum.find().lean();
  const discussionIds = forums.filter((f) => !isNewsForum(f)).map((f) => f._id);
  if (!discussionIds.length) return [];

  const filter = {
    forumId: { $in: discussionIds },
    isHidden: { $ne: true },
  };
  if (opts.lessonSlug) filter.lessonSlug = opts.lessonSlug;
  if (opts.lessonId) filter.learningLessonId = opts.lessonId;
  if (opts.courseSlug) filter.courseSlug = opts.courseSlug;

  const posts = await Post.find(filter)
    .sort({ voteCount: -1, commentCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const forumById = new Map(forums.map((f) => [String(f._id), f]));

  return posts.map((p) => {
    const forum = forumById.get(String(p.forumId));
    return {
      postId: String(p._id),
      title: p.title,
      forumSlug: forum?.slug || 'hoi-dap-hoc-tap',
      href: `/community/post/${p._id}`,
      voteCount: p.voteCount ?? 0,
      commentCount: p.commentCount ?? 0,
      contextTitle: p.contextTitle || null,
    };
  });
}

/**
 * @param {string|null} userId
 * @param {Record<string, unknown>|null} sessionContext
 * @param {string|undefined} userRole
 */
async function enrichAgentContextExtras(userId, sessionContext, userRole) {
  const [activeCohort, conceptGraphCtx, learnerEconomy, studioAssist] = await Promise.all([
    buildCohortContext(userId, sessionContext),
    buildConceptGraphCtx(userId, sessionContext),
    buildLearnerEconomyCtx(userId, sessionContext),
    buildStudioAssistContext(sessionContext, userRole),
  ]);
  return { activeCohort, conceptGraphCtx, learnerEconomy, studioAssist };
}

module.exports = {
  extractBeatConfidence,
  confidenceDisclaimerVi,
  buildCohortContext,
  buildConceptGraphCtx,
  buildLearnerEconomyCtx,
  buildStudioAssistContext,
  searchCommunityThreadsForAgent,
  enrichAgentContextExtras,
};
