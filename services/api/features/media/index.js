const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');
const { persistUploadedFile, getMulterStorage } = require('./uploadStorage');
const { buildMediaStorageKey, extFromFile } = require('./mediaStorageKeys');
const { slugifyCategory } = require('../rewards/lib/decorationSlugs');
const { bulkImportOverlays } = require('../rewards/services/avatarDecorationBulkService');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const fileFilter = (_req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|pdf|glb|gltf|lottie|json)$/i;
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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
});

const avatarUpload = multer({
  storage: getMulterStorage(),
  fileFilter: avatarFileFilter,
});

const decorationBulkUpload = multer({
  storage: getMulterStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: decorationOverlayFilter,
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
