const {
  countPaidPublishedCourses,
} = require('../../courses/services/courseCatalogService');
const { getPublicRuntimeSummary } = require('./gemRuntimeConfigService');
const { listVisiblePublic } = require('./shopCatalogService');
const { listLearnerTiersPublic } = require('../constants/learnerTiers');

const LEARNER_TIER_POLICY_VI =
  'Hạng tính trên tổng gem bạn đã kiếm (không giảm khi tiêu). Mỗi đơn khóa trả phí chỉ một ưu đãi: coupon, voucher gem, hoặc giảm giá hạng.';

function getLearnerTiers() {
  return { tiers: listLearnerTiersPublic(), policyVi: LEARNER_TIER_POLICY_VI };
}

/** Tab voucher chỉ có nghĩa khi trong hệ thống thực sự có khóa trả phí. */
async function getBootstrap() {
  const [paidCoursesCount, runtime] = await Promise.all([
    countPaidPublishedCourses(),
    getPublicRuntimeSummary(),
  ]);
  return { paidCoursesCount, voucherTabVisible: paidCoursesCount >= 1, ...runtime };
}

function listCatalogItems() {
  return listVisiblePublic();
}

module.exports = { getLearnerTiers, getBootstrap, listCatalogItems };
