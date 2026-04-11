const User = require('../models/User');

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const t = email.trim().toLowerCase();
  return t || null;
}

function computeProviderField(user) {
  const hasPwd = !!user.password;
  const g = !!(user.googleId || (user.provider === 'google' && user.providerId));
  const f = !!(user.facebookId || (user.provider === 'facebook' && user.providerId));
  if (hasPwd && (g || f)) return 'multi';
  if (g && f) return 'multi';
  if (g) return 'google';
  if (f) return 'facebook';
  return user.provider === 'local' ? 'local' : user.provider;
}

/**
 * Đồng bộ legacy provider + providerId → googleId / facebookId khi đọc user.
 */
function migrateLegacyIds(user) {
  if (!user) return;
  if (user.provider === 'google' && user.providerId && !user.googleId) {
    user.googleId = user.providerId;
  }
  if (user.provider === 'facebook' && user.providerId && !user.facebookId) {
    user.facebookId = user.providerId;
  }
}

/**
 * Firebase ID token đã verify: uid, email, identities (google.com / facebook.com).
 */
async function findOrLinkFirebaseUser({
  firebaseUid,
  email,
  identities,
  displayName,
  avatar,
  signInProvider,
}) {
  const uid = String(firebaseUid || '').trim();
  if (!uid) throw new Error('Missing Firebase uid');
  const emailNorm = normalizeEmail(email);

  let user = await User.findOne({ firebaseUid: uid });
  if (!user && emailNorm) {
    user = await User.findOne({ email: emailNorm });
  }

  const gProv = identities?.['google.com']?.[0];
  const fProv = identities?.['facebook.com']?.[0];
  const sig = String(signInProvider || '');

  function inferProvider() {
    if (gProv && fProv) return 'multi';
    if (gProv) return 'google';
    if (fProv) return 'facebook';
    if (sig.includes('google')) return 'google';
    if (sig.includes('facebook')) return 'facebook';
    return 'local';
  }

  if (user) {
    migrateLegacyIds(user);
    user.firebaseUid = uid;
    if (gProv) user.googleId = user.googleId || gProv;
    if (fProv) user.facebookId = user.facebookId || fProv;
    if (emailNorm && !user.email) user.email = emailNorm;
    if (displayName && (!user.displayName || user.displayName === 'User')) user.displayName = displayName;
    if (avatar && !user.avatar) user.avatar = avatar;
    user.provider = computeProviderField(user);
    await user.save();
    return user;
  }

  const p = inferProvider();
  return User.create({
    email: emailNorm || undefined,
    firebaseUid: uid,
    googleId: gProv || undefined,
    facebookId: fProv || undefined,
    displayName: (displayName || '').trim() || 'User',
    avatar: avatar || null,
    provider: p,
    providerId: gProv || fProv || uid,
  });
}

module.exports = {
  normalizeEmail,
  findOrLinkFirebaseUser,
  computeProviderField,
};
