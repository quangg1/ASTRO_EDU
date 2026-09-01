/**
 * Một batch có thể chạm nhiều luật thưởng khác nhau; client chỉ hiển thị được
 * một hộp thưởng nên các phần thưởng được gộp lại thành một bản tóm tắt.
 */
function mergeRewardSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const newAchievements = [];
  const seenSlugs = new Set();
  for (const segment of segments) {
    for (const achievement of segment?.newAchievements || []) {
      if (!achievement?.slug || seenSlugs.has(achievement.slug)) continue;
      seenSlugs.add(achievement.slug);
      newAchievements.push(achievement);
    }
  }

  // Số dư và streak lấy theo lượt cuối vì đó là trạng thái mới nhất của ví.
  const last = segments[segments.length - 1];
  return {
    gemsEarned: segments.reduce((total, segment) => total + (segment?.gemsEarned || 0), 0),
    newBalance: last?.newBalance ?? null,
    levelUp: segments.some((segment) => Boolean(segment?.levelUp)),
    newAchievements,
    streakResult: last?.streakResult ?? null,
    labels: segments.map((segment) => segment?.label).filter(Boolean),
    segments,
  };
}

module.exports = { mergeRewardSegments };
