/** Forum tin — slug cố định, crawl RSS. */
const NEWS_FORUM_SLUG = 'tin-thien-van';

/** Diễn đàn thảo luận UGC — bootstrap xóa forum cũ ngoài danh sách này + tin. */
const DISCUSSION_FORUMS = [
  {
    slug: 'hoi-dap-hoc-tap',
    title: 'Hỏi đáp học tập',
    description: 'Câu hỏi về bài học, lộ trình, quiz và khóa học trên Galaxies.',
    icon: '📚',
    order: 10,
    allowTags: true,
    allowCourseLink: true,
  },
  {
    slug: 'thao-luan-thien-van',
    title: 'Thảo luận thiên văn',
    description: 'Chủ đề chung: hiện tượng, lý thuyết, tin tức khoa học và tò mò vũ trụ.',
    icon: '🔭',
    order: 20,
    allowTags: true,
    allowCourseLink: false,
  },
  {
    slug: 'quan-sat-thiet-bi',
    title: 'Quan sát & thiết bị',
    description: 'Kính thiên văn, máy ảnh, địa điểm quan sát và kinh nghiệm thực tế.',
    icon: '🌠',
    order: 30,
    allowTags: true,
    allowCourseLink: false,
  },
  {
    slug: 'du-an-showcase',
    title: 'Dự án & Showcase',
    description: 'Chia sẻ thực thể 3D, dự án studio và sáng tạo trong hệ Mặt Trời.',
    icon: '🪐',
    order: 40,
    allowTags: true,
    allowCourseLink: false,
  },
  {
    slug: 'phan-hoi-ung-dung',
    title: 'Phản hồi ứng dụng',
    description: 'Báo lỗi, góp ý tính năng và trải nghiệm sử dụng Galaxies.',
    icon: '💡',
    order: 50,
    allowTags: true,
    allowCourseLink: false,
  },
];

const ALLOWED_FORUM_SLUGS = new Set([
  NEWS_FORUM_SLUG,
  ...DISCUSSION_FORUMS.map((f) => f.slug),
]);

function isNewsForum(forum) {
  if (!forum) return false;
  return Boolean(forum.isNews) || forum.slug === NEWS_FORUM_SLUG;
}

function getDiscussionForumBySlug(slug) {
  return DISCUSSION_FORUMS.find((f) => f.slug === slug) || null;
}

module.exports = {
  NEWS_FORUM_SLUG,
  DISCUSSION_FORUMS,
  ALLOWED_FORUM_SLUGS,
  isNewsForum,
  getDiscussionForumBySlug,
};
