const { AppError } = require('../../../shared/errors');
const { canEditTutorial } = require('../../../shared/jwtAuth');
const { escapeRegex } = require('../../../shared/escapeRegex');
const {
  tutorialRepository,
  tutorialCategoryRepository,
  tutorialTrackRepository,
  tutorialProgressRepository,
} = require('../repositories');

const NOT_FOUND = 'Không tìm thấy';

function listCategories() {
  return tutorialCategoryRepository.listOrdered();
}

function listTracks() {
  return tutorialTrackRepository.listOrdered();
}

function listPublished({ categoryId, q }) {
  const filter = {};
  if (categoryId) filter.categoryId = categoryId;
  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: regex }, { summary: regex }, { tags: regex }];
  }
  return tutorialRepository.listPublished(filter);
}

async function getPublished(slug) {
  const tutorial = await tutorialRepository.findPublishedBySlug(slug);
  if (!tutorial) throw AppError.notFound('Không tìm thấy bài viết');

  const category = tutorial.categoryId
    ? await tutorialCategoryRepository.findById(tutorial.categoryId)
    : null;

  return {
    ...tutorial,
    category: category
      ? { id: category._id, title: category.title, slug: category.slug }
      : null,
  };
}

async function listForEditor({ userId, userRole }) {
  const [tutorials, categories] = await Promise.all([
    tutorialRepository.listForEditor({ authorId: userRole === 'teacher' ? userId : null }),
    tutorialCategoryRepository.listOrdered(),
  ]);
  return { tutorials, categories };
}

/** Giáo viên chỉ sửa được bài của mình; bài chưa có chủ sẽ được nhận khi lưu. */
async function loadEditableTutorial(slug, { userId, userRole, claimOwnerless = false }) {
  const tutorial = await tutorialRepository.findDocBySlug(slug);
  if (!tutorial) throw AppError.notFound(NOT_FOUND);

  if (userRole === 'teacher') {
    if (claimOwnerless && !tutorial.authorId) {
      tutorial.authorId = userId;
    } else if (!canEditTutorial(tutorial, { id: userId, role: userRole })) {
      throw AppError.forbidden('Không có quyền sửa tutorial này');
    }
  }
  return tutorial;
}

async function getForEditor({ slug, userId, userRole }) {
  const tutorial = await loadEditableTutorial(slug, { userId, userRole });
  const categories = await tutorialCategoryRepository.listOrdered();
  return { tutorial: tutorial.toObject(), categories };
}

async function createTutorial({ input, userId, userRole }) {
  if (await tutorialRepository.exists({ slug: input.slug })) {
    throw AppError.badRequest('Slug đã tồn tại');
  }
  return tutorialRepository.create({
    ...input,
    authorId: userRole === 'teacher' ? userId : null,
  });
}

async function updateTutorial({ slug, input, userId, userRole }) {
  const tutorial = await loadEditableTutorial(slug, {
    userId,
    userRole,
    claimOwnerless: true,
  });

  // Chỉ ghi đè field được gửi lên — editor lưu từng phần.
  for (const [field, value] of Object.entries(input)) {
    if (value !== undefined) tutorial[field] = value;
  }
  await tutorial.save();
  return tutorial;
}

async function deleteTutorial(slug) {
  const deleted = await tutorialRepository.deleteBySlug(slug);
  if (!deleted) throw AppError.notFound(NOT_FOUND);
}

async function getTrackProgress({ slug, userId }) {
  const track = await tutorialTrackRepository.findBySlug(slug);
  if (!track) throw AppError.notFound('Không tìm thấy track');

  const items = (track.topics || []).flatMap((topic) =>
    (topic.subtopics || []).flatMap((subtopic) =>
      (subtopic.items || []).map((item) => item.tutorialSlug),
    ),
  );

  const rows = await tutorialProgressRepository.listForUserAndSlugs(userId, items);
  return {
    items,
    progress: Object.fromEntries(rows.map((row) => [row.tutorialSlug, row])),
  };
}

function markCompleted({ slug, userId }) {
  return tutorialProgressRepository.markCompleted(userId, slug);
}

module.exports = {
  listCategories,
  listTracks,
  listPublished,
  getPublished,
  listForEditor,
  getForEditor,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  getTrackProgress,
  markCompleted,
};
