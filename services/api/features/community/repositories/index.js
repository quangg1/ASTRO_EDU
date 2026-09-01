/**
 * Tầng dữ liệu riêng của feature community. Feature khác cần đọc dữ liệu
 * cộng đồng thì gọi service công khai, không import trực tiếp các repository này.
 */
module.exports = {
  postRepository: require('./postRepository'),
  commentRepository: require('./commentRepository'),
  forumRepository: require('./forumRepository'),
  voteRepository: require('./voteRepository'),
};
