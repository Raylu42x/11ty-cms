const express = require('express');
const router = express.Router();
const { checkPassword } = require('../auth');

router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  try {
    const ok = await checkPassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid password' });
    req.session.loggedIn = true;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/status', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.loggedIn) });
});

module.exports = router;
