const express = require('express');

/**
 * Admin feature barrel.
 *
 * This file only composes sub-routers — every handler, aggregation and policy
 * lives in `routes/ -> controllers/ -> services/ -> repositories/`.
 */
const router = express.Router();

router.use('/gem-economy', require('./gemEconomy'));
router.use('/promo-codes', require('../promotions/routes/adminPromo'));
router.use('/astronomy-calendar', require('../astronomy-calendar').adminAstronomyRoutes);
router.use('/users', require('./routes/adminUsersRoutes'));
router.use('/teacher-applications', require('./routes/adminTeacherApplicationRoutes'));
router.use('/analytics', require('./routes/adminAnalyticsRoutes'));
router.use('/orders', require('./routes/adminOrdersRoutes'));
router.use('/enrollments', require('./routes/adminEnrollmentsRoutes'));
router.use('/courses', require('./routes/adminCoursesRoutes'));
router.use(require('./routes/adminOperationsRoutes'));

module.exports = router;
