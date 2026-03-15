const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');

const S3_BUCKET = process.env.S3_MEDIA_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';
const MEDIA_CDN_URL = process.env.MEDIA_CDN_URL || (S3_BUCKET ? `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com` : null);

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function safeFilename(originalName) {
  const ext = path.extname(originalName) || '';
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  return `${Date.now()}-${base}${ext}`;
}

const fileFilter = (_req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|pdf|glb|gltf|lottie|json)$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
};

const multerOpts = {
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
};

let s3Client = null;
if (S3_BUCKET) {
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: AWS_REGION,
      ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
  } catch (e) {
    console.warn('[media] S3_MEDIA_BUCKET set but @aws-sdk/client-s3 failed:', e.message);
  }
}

if (s3Client) {
  multerOpts.storage = multer.memoryStorage();
} else {
  multerOpts.storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
  });
}

const upload = multer(multerOpts);

const router = express.Router();

router.post('/upload', authMiddleware, requireRole('teacher', 'admin'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded or invalid type' });
  }
  const filename = req.file.filename || safeFilename(req.file.originalname);

  if (s3Client && S3_BUCKET) {
    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      const key = `files/${filename}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || 'application/octet-stream',
        })
      );
      const base = (MEDIA_CDN_URL || '').replace(/\/$/, '');
      const url = `${base}/${key}`;
      return res.json({ success: true, url, filename });
    } catch (err) {
      console.error('[media] S3 upload failed:', err);
      return res.status(500).json({ success: false, error: 'Upload to storage failed' });
    }
  }

  const url = `/files/${filename}`;
  res.json({ success: true, url, filename });
});

router.use('/files', express.static(UPLOAD_DIR));

module.exports = router;
