const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/authSchemas');
const auth = require('../controllers/authController');
const teacher = require('../controllers/teacherApplicationController');

const router = express.Router();

router.post('/register', validate({ body: schema.registerBody }), auth.register);
router.post(
  '/register/verify-email',
  validate({ body: schema.verifyEmailBody }),
  auth.verifyEmail,
);
router.post(
  '/register/resend-verification',
  validate({ body: schema.emailOnlyBody }),
  auth.resendVerification,
);

router.post('/login', validate({ body: schema.loginBody }), auth.login);
router.post('/firebase', validate({ body: schema.firebaseLoginBody }), auth.firebaseLogin);
router.post('/logout', auth.logout);

// `GET /me` tự đọc token vì nó phải phân biệt "chưa đăng nhập" với "phiên hỏng".
router.get('/me', auth.me);
router.patch('/me', authMiddleware, validate({ body: schema.updateProfileBody }), auth.updateMe);
router.delete('/me', authMiddleware, validate({ body: schema.deactivateBody }), auth.deactivateMe);

router.post(
  '/change-password',
  authMiddleware,
  validate({ body: schema.changePasswordBody }),
  auth.changePassword,
);
router.post('/forgot-password', validate({ body: schema.emailOnlyBody }), auth.forgotPassword);
router.post('/reset-password', validate({ body: schema.resetPasswordBody }), auth.resetPassword);

router.post('/teacher-application', authMiddleware, teacher.submit);
router.get('/teacher-application/me', authMiddleware, teacher.myStatus);

const teacherOnly = [authMiddleware, requireRole('teacher', 'admin')];
router.get('/teacher-profile/me', ...teacherOnly, teacher.myProfile);
router.patch('/teacher-profile/me', ...teacherOnly, teacher.updateMyProfile);

module.exports = router;
