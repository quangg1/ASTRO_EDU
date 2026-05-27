const path = require('path');

const ASSIGNMENT_MIME_ALLOW = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
]);

function extMime(ext) {
  const map = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.zip': 'application/zip',
  };
  return map[ext] || null;
}

async function detectAssignmentMime(buffer, filename, declared) {
  if (buffer && buffer.length >= 12) {
    try {
      const { fileTypeFromBuffer } = await import('file-type');
      const detected = await fileTypeFromBuffer(buffer);
      if (detected?.mime && ASSIGNMENT_MIME_ALLOW.has(detected.mime)) {
        return detected.mime;
      }
    } catch (e) {
      console.warn('[assignmentMime] file-type failed:', e.message);
    }
  }
  const ext = path.extname(filename || '').toLowerCase();
  const fromExt = extMime(ext);
  if (fromExt && ASSIGNMENT_MIME_ALLOW.has(fromExt)) return fromExt;
  if (declared && ASSIGNMENT_MIME_ALLOW.has(declared)) return declared;
  return null;
}

module.exports = {
  ASSIGNMENT_MIME_ALLOW,
  detectAssignmentMime,
};
