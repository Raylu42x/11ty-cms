require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { requireAuth } = require('./auth');
const { loadSites } = require('./sites');
const updates = require('./updates');
const { version } = require('../package.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Health check — public, used by Docker healthcheck and uptime monitors
app.get('/healthz', (req, res) => {
  try {
    const sites = loadSites();
    res.json({ ok: true, version, sites: sites.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Public: auth endpoints
app.use('/api/auth', authRoutes);

// Protected: all other API endpoints
app.use('/api', requireAuth, apiRoutes);

// Static assets (CSS, JS, images for the CMS UI itself)
// index: false so express.static never auto-serves index.html — the auth catch-all handles that
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Login page — no auth required
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Everything else → SPA shell (auth enforced)
app.get('*', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

function preflightWarnings() {
  if (!process.env.ADMIN_PASSWORD_HASH) {
    console.warn(
      '\n[11ty CMS] ADMIN_PASSWORD_HASH is not set. The dev fallback password "admin" is active.\n' +
        '          Generate a real hash with:\n' +
        "          node -e \"console.log(require('bcrypt').hashSync('your-password', 10))\"\n" +
        '          then add it to .env as ADMIN_PASSWORD_HASH=...\n'
    );
  }
  if (!process.env.GITHUB_TOKEN) {
    console.warn(
      '[11ty CMS] GITHUB_TOKEN is not set. Publishing will fail until you add a token\n' +
        '          with `repo` and `workflow` scopes to .env.\n'
    );
  }
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'dev-secret-change-me')
  ) {
    console.warn(
      '[11ty CMS] SESSION_SECRET is unset or default in production. Sessions will reset on every\n' +
        '          restart and are guessable. Set a long random value in .env.\n'
    );
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[11ty CMS] Using the default in-memory session store. Sessions are lost on restart.\n' +
        '          Fine for single-admin use; if that bothers you, swap in connect-redis or similar.\n'
    );
  }
}

if (require.main === module) {
  preflightWarnings();
  updates.start();
  app.listen(PORT, () => {
    console.log(`11ty CMS running on http://localhost:${PORT}`);
  });
}

module.exports = app;
