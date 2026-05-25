/**
 * Đồng bộ isPaid + price cho mọi khóa (chạy một lần sau khi sửa catalog).
 *   node services/api/scripts/normalize-course-pricing.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Course = require('../features/courses/models/Course');
const { normalizeCoursePricingFields } = require('../features/courses/lib/coursePricing');
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI');
  await mongoose.connect(uri);
  const courses = await Course.find({});
  let changed = 0;
  for (const course of courses) {
    const before = `${course.isPaid}:${course.price}`;
    normalizeCoursePricingFields(course);
    const after = `${course.isPaid}:${course.price}`;
    if (before !== after) {
      await course.save();
      changed += 1;
      console.log(`  ${course.slug}: ${before} → ${after}`);
    }
  }
  console.log(`Done. Updated ${changed}/${courses.length} courses.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
