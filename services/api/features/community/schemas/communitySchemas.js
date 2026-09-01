const { z, schemas } = require('../../../shared/http');

const { objectId, slug } = schemas;

const MAX_PAGE_SIZE = 50;

/** Trang/limit sai kiểu là chuyện thường ở query string — kẹp về khoảng hợp lệ thay vì báo lỗi. */
const page = z.coerce.number().int().min(1).catch(1).default(1);
const limit = z.coerce
  .number()
  .int()
  .min(1)
  .catch(20)
  .default(20)
  .transform((value) => Math.min(MAX_PAGE_SIZE, value));
const sort = z.enum(['newest', 'top', 'hot']).catch('newest').default('newest');

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

/** Chuỗi rỗng nghĩa là "không có" — lưu null để truy vấn nhất quán. */
const nullableText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const postIdParams = z.object({ id: objectId });
const commentIdParams = z.object({ id: objectId });
const forumSlugParams = z.object({ slug });

const forumPostsQuery = z.object({
  page,
  limit,
  sort,
  q: optionalText(200),
  category: optionalText(100),
  tag: optionalText(40),
  courseSlug: optionalText(160),
  lessonSlug: optionalText(160),
  pathSource: optionalText(20),
  learningLessonId: optionalText(120),
});

const newsQuery = z.object({
  page,
  limit,
  sort,
  q: optionalText(200),
  category: optionalText(100),
});

const searchQuery = z.object({
  page,
  limit,
  sort,
  q: optionalText(200),
  scope: z.enum(['all', 'news', 'discussion']).catch('all').default('all'),
  forumSlug: optionalText(160),
  tag: optionalText(40),
  category: optionalText(100),
});

const tagsQuery = z.object({
  limit: z.coerce.number().int().min(1).catch(30).default(30),
});

const tagParams = z.object({
  tag: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase().replace(/^#/, ''))
    .refine((value) => value.length > 0, 'Thiếu tag'),
});

const tagPostsQuery = z.object({ page, limit, sort });

const voteBody = z.object({
  value: z.coerce
    .number()
    .refine((value) => value === 1 || value === -1, 'value phải là 1 hoặc -1'),
});

const commentBody = z.object({
  content: z.string().trim().min(1, 'Nội dung là bắt buộc').max(20000),
  parentId: objectId.nullish().transform((value) => value || null),
});

const createPostBody = z.object({
  title: z.string().trim().min(1, 'Thiếu tiêu đề').max(300),
  content: z
    .string()
    .trim()
    .max(50000)
    .optional()
    .transform((value) => value || ''),
  courseId: nullableText(120),
  courseSlug: nullableText(160),
  lessonSlug: nullableText(160),
  pathSource: z
    .enum(['course', 'learning-path'])
    .nullish()
    .catch(null)
    .transform((value) => value || null),
  contextTitle: nullableText(500),
  learningModuleId: nullableText(120),
  learningNodeId: nullableText(120),
  learningLessonId: nullableText(120),
  tags: z.array(z.string()).optional(),
});

const moderatePostBody = z.object({
  isPinned: z.boolean().optional(),
});

module.exports = {
  postIdParams,
  commentIdParams,
  forumSlugParams,
  forumPostsQuery,
  newsQuery,
  searchQuery,
  tagsQuery,
  tagParams,
  tagPostsQuery,
  voteBody,
  commentBody,
  createPostBody,
  moderatePostBody,
};
