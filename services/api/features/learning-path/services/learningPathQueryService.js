/**
 * API đọc công khai của lộ trình học.
 *
 * Onboarding, trợ giảng và Explore đều cần chương trình học và tiến độ, nhưng
 * không feature nào được chạm vào `LearningPath`/`UserProgress` — mọi truy vấn
 * xuyên feature đi qua đây để hình dạng dữ liệu chỉ đổi ở một chỗ.
 */
const {
  learningPathRepository,
  userProgressRepository,
} = require('../repositories/learningPathRepository');

/** Không ném lỗi khi thiếu dữ liệu: bên gọi luôn có đường lui riêng. */
async function getMainCurriculum() {
  const doc = await learningPathRepository.findMain();
  return {
    modules: doc?.modules || [],
    concepts: doc?.concepts || [],
    published: Boolean(doc?.published),
  };
}

async function getMainModules() {
  const { modules } = await getMainCurriculum();
  return modules;
}

/** Tiến độ thô của một người học (bài đã xong, mốc, quiz) hoặc `null`. */
function getLearnerProgress(userId) {
  if (!userId) return Promise.resolve(null);
  return userProgressRepository.findForUser(String(userId));
}

/**
 * Đồng bộ mastery từ learning-state engine — đánh dấu bài hoàn thành + mastered.
 */
async function markLessonCompletedAndMastered(userId, lessonId) {
  if (!userId || !lessonId) return null;
  const uid = String(userId);
  const lid = String(lessonId).trim();
  const doc = await userProgressRepository.findForUser(uid);
  const mastered = new Set((doc?.learningPathMasteredLessonIds || []).map(String));
  const completed = new Set((doc?.learningPathCompletedLessonIds || []).map(String));
  mastered.add(lid);
  completed.add(lid);
  return userProgressRepository.saveForUser(uid, {
    learningPathMasteredLessonIds: [...mastered],
    learningPathCompletedLessonIds: [...completed],
    learningPathLastLessonId: lid,
  });
}

module.exports = {
  getMainCurriculum,
  getMainModules,
  getLearnerProgress,
  markLessonCompletedAndMastered,
};
