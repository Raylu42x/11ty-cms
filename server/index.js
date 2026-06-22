require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { requireAuth, isAdminConfigured } = require('./auth');
const { loadSites } = require('./sites');
const updates = require('./updates');
const { version } = require('../package.json');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions live in a signed cookie — stateless, survives restarts, no extra store.
app.use(
  cookieSession({
    name: 'cms.sid',
    keys: [process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')],
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
);

// Rate-limit auth endpoints to slow brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

// Health check — public, used by Docker healthcheck and uptime monitors
app.get('/healthz', (req, res) => {
  try {
    const sites = loadSites();
    res.json({ ok: true, version, sites: sites.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Public: auth endpoints (rate-limited)
app.use('/api/auth', authLimiter, authRoutes);

// Protected: all other API endpoints
app.use('/api', requireAuth, apiRoutes);

// Static assets (CSS, JS, images for the CMS UI itself)
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// First-run setup page — only when no admin is configured
app.get('/setup', (req, res) => {
  if (isAdminConfigured()) return res.redirect('/login');
  res.sendFile(path.join(__dirname, '../public/setup.html'));
});

// Login page — redirects to setup if no admin yet
app.get('/login', (req, res) => {
  if (!isAdminConfigured()) return res.redirect('/setup');
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Everything else → SPA shell (auth enforced)
app.get('*', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

function preflightWarnings() {
  if (!process.env.GITHUB_TOKEN) {
    console.warn(
      '[11ty CMS] GITHUB_TOKEN is not set. Publishing will fail until you add a token\n' +
        '          with `repo` and `workflow` scopes to .env.\n'
    );
  }
  if (!process.env.SESSION_SECRET) {
    console.warn(
      '[11ty CMS] SESSION_SECRET is not set. Using a random ephemeral key — sessions will\n' +
        '          reset on every restart. Set SESSION_SECRET in .env (openssl rand -hex 32).\n'
    );
  }
}

if (require.main === module) {
  preflightWarnings();
  updates.start();
  app.listen(PORT, HOST, () => {
    console.log(`11ty CMS running on http://${HOST}:${PORT}`);
    if (!isAdminConfigured()) {
      console.log('First-run setup required. Visit /setup to create your admin password.');
    }
  });
}

module.exports = app;
