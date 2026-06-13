const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');
const { persistUploadedFile, getMulterStorage } = require('./uploadStorage');
const { buildMediaStorageKey, extFromFile } = require('./mediaStorageKeys');
const { detectAssignmentMime } = require('../courses/lib/assignmentMime');
const { slugifyCategory } = require('../rewards/lib/decorationSlugs');
const { bulkImportOverlays } = require('../rewards/services/avatarDecorationBulkService');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const fileFilter = (_req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|pdf|glb|gltf|bin|lottie|json)$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
};

const avatarFileFilter = (_req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
};

const decorationOverlayFilter = (_req, file, cb) => {
  const allowed = /\.(png|webp|gif)$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
};

const upload = multer({
  storage: getMulterStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

const avatarUpload = multer({
  storage: getMulterStorage(),
  fileFilter: avatarFileFilter,
  limits: { fileSize: 12 * 1024 * 1024 },
});

const observationPhotoUpload = multer({
  storage: getMulterStorage(),
  fileFilter: avatarFileFilter,
  limits: { fileSize: 12 * 1024 * 1024 },
});

const decorationBulkUpload = multer({
  storage: getMulterStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: decorationOverlayFilter,
});

const assignmentStagingFilter = (_req, file, cb) => {
  const allowed = /\.(pdf|jpe?g|png|webp|docx?|zip)$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
};

const assignmentStagingUpload = multer({
  storage: getMulterStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: assignmentStagingFilter,
});

const teacherCvFilter = (_req, file, cb) => {
  const allowed = /\.pdf$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
};

const teacherCvUpload = multer({
  storage: getMulterStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: teacherCvFilter,
});

const teacherCertFilter = (_req, file, cb) => {
  const allowed = /\.(pdf|jpe?g|png|webp)$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
};

const teacherCertUpload = multer({
  storage: getMulterStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: teacherCertFilter,
});

const router = express.Router();

router.post('/upload', authMiddleware, requireRole('teacher', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 'MEDIA_INVALID_FILE',
        error: 'Chưa tải tệp lên hoặc định dạng tệp không hợp lệ',
      });
    }
    const storageKey = buildMediaStorageKey(
      {
        purpose: req.body?.purpose,
        entityId: req.body?.entityId,
        slug: req.body?.slug,
        lessonSlug: req.body?.lessonSlug,
        variant: req.body?.variant,
      },
      req.file,
    );
    const { url, filename: storedName, storageKey: key } = await persistUploadedFile(req.file, storageKey);
    res.json({ success: true, url, filename: storedName, storageKey: key });
  } catch (err) {
    console.error('[media] upload error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'MEDIA_UPLOAD_FAILED',
      error: err.message || 'Tải tệp lên thất bại',
    });
  }
});

/** Assignment staging — học viên đã đăng nhập; magic-byte MIME. */
router.post(
  '/upload/assignment-staging',
  authMiddleware,
  assignmentStagingUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Chọn file PDF, Word, ảnh hoặc ZIP.' });
      }
      const entityId = String(req.body?.entityId || '').trim();
      if (!entityId) {
        return res.status(400).json({ success: false, error: 'Thiếu entityId (submission id)' });
      }
      const buffer = req.file.buffer || null;
      const safeMime = await detectAssignmentMime(buffer, req.file.originalname, req.file.mimetype);
      if (!safeMime) {
        return res.status(400).json({ success: false, error: 'Định dạng file không được phép' });
      }
      const storageKey = buildMediaStorageKey(
        { purpose: 'assignment-staging', entityId, variant: req.body?.variant || 'file' },
        req.file,
      );
      const { url, filename: storedName, storageKey: key } = await persistUploadedFile(req.file, storageKey);
      res.json({ success: true, url, filename: storedName, storageKey: key, mime: safeMime });
    } catch (err) {
      console.error('[media] assignment-staging error:', err);
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Tải tệp lên thất bại',
      });
    }
  },
);

/** CV ứng tuyển giảng viên — học viên đã đăng nhập; chỉ PDF. */
router.post('/upload/teacher-application-cv', authMiddleware, teacherCvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Chọn file PDF (CV).',
      });
    }
    const userId = String(req.userId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ' });
    }
    const storageKey = `teacher-applications/${userId}/cv-${Date.now()}${extFromFile(req.file)}`;
    const { url, filename: storedName, storageKey: key } = await persistUploadedFile(req.file, storageKey);
    res.json({
      success: true,
      url,
      filename: req.file.originalname || storedName,
      storageKey: key,
    });
  } catch (err) {
    console.error('[media] teacher-application-cv error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Tải CV thất bại',
    });
  }
});

/** Giấy tờ xác nhận (quyết định, thẻ GV…) — PDF hoặc ảnh. */
router.post(
  '/upload/teacher-application-certificate',
  authMiddleware,
  teacherCertUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Chọn file PDF hoặc ảnh (JPG/PNG/WebP).',
        });
      }
      const userId = String(req.userId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ' });
      }
      const storageKey = `teacher-applications/${userId}/cert-${Date.now()}${extFromFile(req.file)}`;
      const { url, filename: storedName, storageKey: key } = await persistUploadedFile(req.file, storageKey);
      res.json({
        success: true,
        url,
        filename: req.file.originalname || storedName,
        storageKey: key,
      });
    } catch (err) {
      console.error('[media] teacher-application-certificate error:', err);
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Tải giấy tờ thất bại',
      });
    }
  },
);

/** Ảnh đại diện — mọi user đã đăng nhập; lưu S3/CDN `avatars/{userId}/...` khi có bucket. */
router.post('/upload/avatar', authMiddleware, avatarUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 'MEDIA_INVALID_FILE',
        error: 'Chọn ảnh JPG, PNG, GIF hoặc WebP.',
      });
    }
    const userId = String(req.userId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ' });
    }
    const ext = extFromFile(req.file);
    const storageKey = `avatars/${userId}/avatar${ext}`;
    const { url, cdn } = await persistUploadedFile(req.file, storageKey);
    res.json({ success: true, url, cdn: Boolean(cdn) });
  } catch (err) {
    console.error('[media] avatar upload error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'MEDIA_UPLOAD_FAILED',
      error: err.message || 'Tải ảnh đại diện thất bại',
    });
  }
});

/** Ảnh quan sát thiên văn — mọi user đã đăng nhập; lưu `observations/{userId}/...`. */
router.post('/upload/observation-photo', authMiddleware, observationPhotoUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 'MEDIA_INVALID_FILE',
        error: 'Chọn ảnh JPG, PNG, GIF hoặc WebP.',
      });
    }
    const userId = String(req.userId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ' });
    }
    const ext = extFromFile(req.file);
    const storageKey = `observations/${userId}/${Date.now()}${ext}`;
    const { url, cdn } = await persistUploadedFile(req.file, storageKey);
    res.json({ success: true, url, cdn: Boolean(cdn) });
  } catch (err) {
    console.error('[media] observation-photo upload error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'MEDIA_UPLOAD_FAILED',
      error: err.message || 'Tải ảnh quan sát thất bại',
    });
  }
});

/** Nhiều overlay cùng lúc → CDN `decorations/categories/{slug}/overlays/*` + ShopItem 0 gem. */
router.post(
  '/upload/decoration-bulk',
  authMiddleware,
  requireRole('admin'),
  decorationBulkUpload.array('files', 48),
  async (req, res) => {
    try {
      const categorySlug = String(req.body?.categorySlug || '').trim();
      if (!categorySlug) {
        return res.status(400).json({ success: false, error: 'Thiếu categorySlug (nhóm trang trí)' });
      }
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ success: false, error: 'Chọn ít nhất một file PNG/WebP/GIF.' });
      }
      const data = await bulkImportOverlays(categorySlug, files, req.userId);
      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('[media] decoration bulk upload error:', err);
      res.status(err.status || 500).json({
        success: false,
        code: err.code || 'MEDIA_UPLOAD_FAILED',
        error: err.message || 'Import hàng loạt thất bại',
      });
    }
  },
);

const categoryBannerFilter = (_req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|webp)$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
};

const categoryBannerUpload = multer({
  storage: getMulterStorage(),
  fileFilter: categoryBannerFilter,
});

/** Banner ngang cho nhóm trang trí — `decorations/categories/{slug}/banner.{ext}` */
router.post(
  '/upload/decoration-category-banner',
  authMiddleware,
  requireRole('admin'),
  categoryBannerUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Chọn ảnh banner (JPG/PNG/WebP).' });
      }
      const categorySlug = slugifyCategory(req.body?.categorySlug || '');
      if (!categorySlug) {
        return res.status(400).json({ success: false, error: 'Thiếu categorySlug' });
      }
      const ext = path.extname(req.file.originalname) || '.jpg';
      const storageKey = `decorations/categories/${categorySlug}/banner${ext}`;
      const { url, cdn } = await persistUploadedFile(req.file, storageKey);
      res.json({ success: true, url, bannerUrl: url, cdn: Boolean(cdn), categorySlug });
    } catch (err) {
      console.error('[media] category banner upload error:', err);
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Tải banner thất bại',
      });
    }
  },
);

router.use('/files', express.static(UPLOAD_DIR));

module.exports = router;
