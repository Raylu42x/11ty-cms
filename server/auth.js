const bcrypt = require('bcrypt');

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.redirect('/login');
}

async function checkPassword(plain) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    // Dev fallback: accept literal "admin" when no hash is configured
    return plain === 'admin';
  }
  return bcrypt.compare(plain, hash);
}

module.exports = { requireAuth, checkPassword };
