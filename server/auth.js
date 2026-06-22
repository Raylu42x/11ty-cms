const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const ADMIN_FILE = path.join(__dirname, '../config/admin.json');

function getAdminHash() {
  if (process.env.ADMIN_PASSWORD_HASH) return process.env.ADMIN_PASSWORD_HASH;
  if (fs.existsSync(ADMIN_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8')).passwordHash || null;
    } catch {
      return null;
    }
  }
  return null;
}

function isAdminConfigured() {
  return !!getAdminHash();
}

function setAdminPassword(plain) {
  if (!plain || plain.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const hash = bcrypt.hashSync(plain, 12);
  fs.mkdirSync(path.dirname(ADMIN_FILE), { recursive: true });
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({ passwordHash: hash }, null, 2) + '\n', 'utf8');
}

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.redirect('/login');
}

async function checkPassword(plain) {
  const hash = getAdminHash();
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

module.exports = { requireAuth, checkPassword, isAdminConfigured, setAdminPassword };
