/**
 * Xóa toàn bộ bài viết trong chuyên mục Tin thiên văn (và comment, vote liên quan),
 * reset postCount — để sau đó chạy lại `npm run crawl-news` và chỉ giữ bài crawl mới.
 *
 * Chạy (bắt buộc xác nhận):
 *   cd services/api && set PURGE_NEWS_CONFIRM=yes&& npm run purge-news
 * PowerShell:
 *   $env:PURGE_NEWS_CONFIRM="yes"; npm run purge-news
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

const Forum = require('../features/community/models/Forum');
const Post = require('../features/community/models/Post');
const Comment = require('../features/community/models/Comment');
const Vote = require('../features/community/models/Vote');

async function main() {
  if (String(process.env.PURGE_NEWS_CONFIRM || '').toLowerCase() !== 'yes') {
    console.error(
      'Từ chối: đặt biến môi trường PURGE_NEWS_CONFIRM=yes để xóa mọi bài trong Tin thiên văn.'
    );
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(uri);

  let forum = await Forum.findOne({ slug: 'tin-thien-van' });
  if (!forum) forum = await Forum.findOne({ isNews: true });

  if (!forum) {
    console.log('Không có forum tin thiên văn — không có gì để xóa.');
    await mongoose.disconnect();
    return;
  }

  const posts = await Post.find({ forumId: forum._id }).select('_id').lean();
  const ids = posts.map((p) => p._id);

  if (ids.length === 0) {
    await Forum.findByIdAndUpdate(forum._id, { $set: { postCount: 0 } });
    console.log('Không có bài viết nào trong chuyên mục này.');
    await mongoose.disconnect();
    return;
  }

  const comments = await Comment.find({ postId: { $in: ids } }).select('_id').lean();
  const commentIds = comments.map((c) => c._id);

  const delVotesComments =
    commentIds.length > 0
      ? await Vote.deleteMany({ targetType: 'comment', targetId: { $in: commentIds } })
      : { deletedCount: 0 };
  const delVotesPosts = await Vote.deleteMany({
    targetType: 'post',
    targetId: { $in: ids },
  });
  const delComments = await Comment.deleteMany({ postId: { $in: ids } });
  const delPosts = await Post.deleteMany({ _id: { $in: ids } });

  await Forum.findByIdAndUpdate(forum._id, { $set: { postCount: 0 } });

  console.log(
    `Đã xóa: ${delPosts.deletedCount} bài, ${delComments.deletedCount} bình luận, ` +
      `${delVotesPosts.deletedCount} vote (bài), ${delVotesComments.deletedCount} vote (bình luận).`
  );
  console.log('Chạy tiếp: npm run crawl-news');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
