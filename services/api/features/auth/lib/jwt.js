const authShared = require('@galaxies/auth-shared');

function issueToken(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    provider: user.provider,
    role: user.role || 'student',
  };
  return authShared.issueToken(payload);
}

module.exports = { issueToken, verifyToken: authShared.verifyToken };
