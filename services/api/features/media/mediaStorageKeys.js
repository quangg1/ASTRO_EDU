const path = require('path');
const crypto = require('crypto');

/** @type {Set<string>} */
const KNOWN_PURPOSES = new Set([
  'course-thumbnail',
  'course-lesson',
  'course-block',
  'showcase-entity',
  'learning-path-lesson',
]);

function sanitizeSegment(raw, maxLen = 80) {
  const s = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);
  return s;
}

function extFromFile(file) {
  const fromName = path.extname(file?.originalname || '').toLowerCase();
  if (fromName && /^\.[a-z0-9]+$/i.test(fromName)) return fromName;
  const mt = file?.mimetype || '';
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'model/gltf-binary': '.glb',
    'model/gltf+json': '.gltf',
    'application/pdf': '.pdf',
    'application/json': '.json',
  };
  return map[mt] || '.bin';
}

function invalidContextError(message) {
  const e = new Error(message);
  e.status = 400;
  e.code = 'MEDIA_INVALID_CONTEXT';
  return e;
}

function resolveEntityId(ctx) {
  const id = sanitizeSegment(ctx?.entityId, 48);
  if (id) return id;
  return sanitizeSegment(ctx?.slug, 80);
}

/**
 * CDN/S3 key theo loại media và entity gắn kèm — không dùng tên file gốc.
 * @param {{ purpose?: string, entityId?: string, slug?: string, lessonSlug?: string, variant?: string }} ctx
 * @param {Express.Multer.File} file
 * @returns {string}
 */
function buildMediaStorageKey(ctx, file) {
  const ext = extFromFile(file);
  const purpose = String(ctx?.purpose || 'generic').trim();

  if (!KNOWN_PURPOSES.has(purpose)) {
    const stamp = new Date().toISOString().slice(0, 10);
    const token = crypto.randomBytes(6).toString('hex');
    return `misc/${stamp}/${token}${ext}`;
  }

  const entityId = resolveEntityId(ctx);
  const variant = sanitizeSegment(ctx?.variant || 'asset', 48);
  const lessonSlug = sanitizeSegment(ctx?.lessonSlug, 80);

  switch (purpose) {
    case 'course-thumbnail': {
      if (!entityId) throw invalidContextError('course-thumbnail cần entityId hoặc slug khóa học');
      return `courses/${entityId}/thumbnail${ext}`;
    }
    case 'course-lesson': {
      if (!entityId || !lessonSlug) {
        throw invalidContextError('course-lesson cần entityId và lessonSlug');
      }
      return `courses/${entityId}/lessons/${lessonSlug}/${variant}${ext}`;
    }
    case 'course-block': {
      if (!entityId || !lessonSlug) {
        throw invalidContextError('course-block cần entityId và lessonSlug');
      }
      return `courses/${entityId}/lessons/${lessonSlug}/blocks/${variant}${ext}`;
    }
    case 'showcase-entity': {
      if (!entityId) throw invalidContextError('showcase-entity cần entityId');
      return `showcase-entities/${entityId}/${variant}${ext}`;
    }
    case 'learning-path-lesson': {
      if (!entityId) throw invalidContextError('learning-path-lesson cần entityId (lesson id)');
      return `learning-path/lessons/${entityId}/${variant}${ext}`;
    }
    default: {
      const stamp = new Date().toISOString().slice(0, 10);
      const token = crypto.randomBytes(6).toString('hex');
      return `misc/${stamp}/${token}${ext}`;
    }
  }
}

module.exports = {
  buildMediaStorageKey,
  sanitizeSegment,
  extFromFile,
  KNOWN_PURPOSES,
};
