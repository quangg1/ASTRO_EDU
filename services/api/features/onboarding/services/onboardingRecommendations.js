const fs = require('fs');
const path = require('path');
const LearningPath = require('../../learning-path/models/LearningPath');
const { INTENT_FORUM_SLUG } = require('../constants/onboardingOptions');
const {
  experienceToDepth,
  appendQuery,
  buildOnboardingPrimaryHref,
  buildStarterLessonHref,
  buildExploreEntityHref,
} = require('./onboardingRedirectUrls');

async function loadLearningPathModules() {
  const doc = await LearningPath.findOne({ slug: 'main' }).select('modules').lean();
  if (doc?.modules?.length) return doc.modules;
  const p = path.join(__dirname, '../../../data/learningPathDefault.json');
  if (fs.existsSync(p)) {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(parsed.modules)) return parsed.modules;
  }
  return [];
}

function pickStarterLesson(modules, topicIds, preferredDepth = 'beginner') {
  const topics = topicIds?.length ? topicIds : ['astrophysics'];
  const depthKey = ['beginner', 'explorer', 'researcher'].includes(preferredDepth)
    ? preferredDepth
    : 'beginner';
  let best = null;

  for (const mod of modules) {
    for (const node of mod.nodes || []) {
      for (const tid of topics) {
        const hit = (node.topicWeights || []).find((tw) => tw.topicId === tid);
        if (!hit || hit.weight < 0.12) continue;
        const lesson =
          node.depths?.[depthKey]?.[0] ||
          node.depths?.beginner?.[0] ||
          node.depths?.explorer?.[0] ||
          node.depths?.researcher?.[0];
        if (!lesson?.id) continue;
        const score = hit.weight;
        if (!best || score > best.score) {
          best = {
            score,
            moduleId: mod.id,
            nodeId: node.id,
            lessonId: lesson.id,
            lessonTitleVi: lesson.titleVi || '',
            topicId: tid,
            depth: depthKey,
          };
        }
      }
    }
  }
  return best;
}

/**
 * @param {{ primaryIntent: string, topicIds: string[], experienceLevel?: string, modules?: object[] }} input
 */
async function buildOnboardingRecommendations(input) {
  const modules = input.modules || (await loadLearningPathModules());
  const topicIds = Array.isArray(input.topicIds) ? input.topicIds : [];
  const primaryTopicId = topicIds[0] || 'astrophysics';
  const intent = input.primaryIntent || 'mixed';
  const depth = experienceToDepth(input.experienceLevel);
  const starter = pickStarterLesson(modules, topicIds, depth);
  const starterHref = buildStarterLessonHref(starter, depth);

  const recommendations = [];

  if (intent === 'explore_3d' || intent === 'mixed') {
    recommendations.push({
      kind: 'explore',
      href: appendQuery('/explore', { from: 'onboarding', tour: '1' }),
      labelVi: 'Mở Explore 3D',
      descriptionVi: 'Bay quanh hệ Mặt Trời và chạm vào từng thiên thể.',
    });
    recommendations.push({
      kind: 'explore_entity',
      href: buildExploreEntityHref(primaryTopicId, { from: 'onboarding', tour: '1' }),
      labelVi: 'Khám phá theo chủ đề bạn chọn',
      descriptionVi: 'Thực thể 3D gợi ý từ chủ đề onboarding.',
    });
  }

  if (intent === 'learn_path' || intent === 'mixed') {
    recommendations.push({
      kind: 'topic',
      href: appendQuery(`/topics/${encodeURIComponent(primaryTopicId)}`, {
        from: 'onboarding',
        topics: topicIds.join(','),
        depth,
      }),
      labelVi: 'Lộ trình theo chủ đề',
      descriptionVi: 'Các node lộ trình được sắp theo sở thích của bạn.',
    });
    if (starterHref) {
      recommendations.push({
        kind: 'lesson',
        href: starterHref,
        labelVi: starter.lessonTitleVi || 'Bài starter',
        descriptionVi: 'Điểm bắt đầu gợi ý — đọc đủ thời gian để nhận Gem.',
      });
    }
  }

  if (intent === 'stargazing' || intent === 'mixed') {
    recommendations.push({
      kind: 'cosmos',
      href: buildOnboardingPrimaryHref({
        primaryIntent: 'stargazing',
        topicIds,
        experienceLevel: input.experienceLevel,
        primaryTopicId,
      }),
      labelVi: 'Bản đồ thiên hà 200 Mpc',
      descriptionVi: '4.673 thiên hà quanh Dải Ngân Hà — mô phỏng tương tác.',
    });
    recommendations.push({
      kind: 'forum',
      href: appendQuery('/community/quan-sat-thiet-bi', { from: 'onboarding', topics: topicIds.join(',') }),
      labelVi: 'Diễn đàn Quan sát & thiết bị',
      descriptionVi: 'Kính, địa điểm quan sát và kinh nghiệm thực tế.',
    });
  }

  if (intent === 'community' || intent === 'mixed') {
    const forumSlug = INTENT_FORUM_SLUG[intent] || 'hoi-dap-hoc-tap';
    recommendations.push({
      kind: 'forum',
      href: appendQuery(`/community/${forumSlug}`, {
        from: 'onboarding',
        topics: topicIds.join(','),
      }),
      labelVi: 'Tham gia thảo luận',
      descriptionVi: 'Đặt câu hỏi và học từ cộng đồng.',
    });
  }

  if (starterHref && intent === 'stargazing') {
    recommendations.push({
      kind: 'topic',
      href: appendQuery(`/topics/${encodeURIComponent(primaryTopicId)}`, {
        from: 'onboarding',
        topics: topicIds.join(','),
        depth,
      }),
      labelVi: 'Lộ trình theo chủ đề',
      descriptionVi: 'Bổ sung kiến thức nền cho quan sát.',
    });
  }

  recommendations.push({
    kind: 'tutorial',
    href: '/tutorial',
    labelVi: 'Toàn bộ lộ trình',
    descriptionVi: 'Xem bản đồ module khi bạn sẵn sàng đi xa hơn.',
  });

  const primaryHref =
    buildOnboardingPrimaryHref({
      primaryIntent: intent,
      topicIds,
      experienceLevel: input.experienceLevel,
      primaryTopicId,
    }) ||
    recommendations[0]?.href ||
    '/dashboard';

  return {
    primaryTopicId,
    primaryHref,
    starter,
    recommendations,
  };
}

module.exports = {
  loadLearningPathModules,
  pickStarterLesson,
  buildOnboardingRecommendations,
};
