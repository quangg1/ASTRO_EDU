const path = require('path');
const fs = require('fs');

const S3_BUCKET = process.env.S3_MEDIA_BUCKET;
const AWS_REGION = process.env.AWS_REGION;
const MEDIA_CDN_URL =
  process.env.MEDIA_CDN_URL ||
    (S3_BUCKET && AWS_REGION ? `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com` : null);

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

function safeFilename(originalName) {
  const ext = path.extname(originalName) || '';
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  return `${Date.now()}-${base}${ext}`;
}

let s3Client = null;
if (S3_BUCKET) {
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
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

/**
 * Lưu buffer/disk file — S3 + CDN URL khi cấu hình, không thì `/files/...` local.
 * @param {Express.Multer.File} file
 * @param {string} storageKey — ví dụ `files/foo.jpg` hoặc `avatars/userId/foo.jpg`
 */
async function persistUploadedFile(file, storageKey) {
  if (!file) {
    const e = new Error('Chưa tải tệp lên');
    e.status = 400;
    e.code = 'MEDIA_INVALID_FILE';
    throw e;
  }

  if (s3Client && S3_BUCKET) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const body = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
    if (!body) {
      const e = new Error('Không đọc được nội dung tệp');
      e.status = 500;
      throw e;
    }
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: storageKey,
        Body: body,
        ContentType: file.mimetype || 'application/octet-stream',
      }),
    );
    const base = (MEDIA_CDN_URL || '').replace(/\/$/, '');
    const url = `${base}/${storageKey}`;
    return { url, filename: path.basename(storageKey), storageKey, cdn: true };
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  const relativePath = storageKey.replace(/\\/g, '/');
  const dest = path.join(UPLOAD_DIR, relativePath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (file.path) {
    fs.renameSync(file.path, dest);
  } else if (file.buffer) {
    fs.writeFileSync(dest, file.buffer);
  }
  const url = `/files/${relativePath}`;
  return { url, filename: path.basename(relativePath), storageKey, cdn: false };
}

function getMulterStorage() {
  if (s3Client) {
    const multer = require('multer');
    return multer.memoryStorage();
  }
  const multer = require('multer');
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => cb(null, safeFilename(file.originalname)),
  });
}

function resolveLocalPath(storageKey) {
  const relativePath = String(storageKey || '').replace(/\\/g, '/');
  return path.join(UPLOAD_DIR, relativePath);
}

async function storageObjectExists(storageKey) {
  if (!storageKey) return false;
  if (s3Client && S3_BUCKET) {
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: storageKey }));
      return true;
    } catch (e) {
      if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
      throw e;
    }
  }
  return fs.existsSync(resolveLocalPath(storageKey));
}

async function deleteStorageObject(storageKey) {
  if (!storageKey) return false;
  if (s3Client && S3_BUCKET) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: storageKey }));
    return true;
  }
  const dest = resolveLocalPath(storageKey);
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
    return true;
  }
  return false;
}

function readStorageBuffer(storageKey) {
  if (!storageKey) return null;
  if (s3Client && S3_BUCKET) return null;
  const dest = resolveLocalPath(storageKey);
  if (!fs.existsSync(dest)) return null;
  return fs.readFileSync(dest);
}

module.exports = {
  persistUploadedFile,
  getMulterStorage,
  safeFilename,
  hasS3: Boolean(s3Client && S3_BUCKET),
  storageObjectExists,
  deleteStorageObject,
  readStorageBuffer,
  UPLOAD_DIR,
};
