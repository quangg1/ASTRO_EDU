const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, requireRole } = require('../../shared/jwtAuth');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|pdf|glb|gltf|lottie|json)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

const router = express.Router();

router.post('/upload', authMiddleware, requireRole('teacher', 'admin'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded or invalid type' });
  }
  const url = `/files/${req.file.filename}`;
  res.json({ success: true, url, filename: req.file.filename });
});

router.use('/files', express.static(UPLOAD_DIR));

module.exports = router;
