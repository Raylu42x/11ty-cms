require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  }
}));

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

app.listen(PORT, () => {
  console.log(`11ty CMS running on http://localhost:${PORT}`);
});
