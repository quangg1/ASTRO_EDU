/**
 * Firebase Admin — verify ID token từ client (Google/Facebook qua Firebase Auth).
 * Đặt FIREBASE_SERVICE_ACCOUNT_JSON = toàn bộ JSON service account (một dòng).
 */
let cachedAdmin = null;

function getFirebaseAdmin() {
  if (cachedAdmin) {
    return cachedAdmin;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) {
    return null;
  }
  try {
    const admin = require('firebase-admin');
    if (admin.apps.length > 0) {
      cachedAdmin = admin;
      return admin;
    }
    const sa = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(sa),
    });
    cachedAdmin = admin;
    return admin;
  } catch (e) {
    console.error('[auth] Firebase Admin init failed:', e.message);
    return null;
  }
}

function isFirebaseConfigured() {
  return !!getFirebaseAdmin();
}

module.exports = { getFirebaseAdmin, isFirebaseConfigured };
