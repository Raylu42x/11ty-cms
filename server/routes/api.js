const express = require('express');
const router = express.Router();

const fs = require('fs');
const { loadSites, saveSites, getSite, repoPath } = require('../sites');
const { cloneOrPull, getStatus, commitAndPush, getFileLog } = require('../git');
const { listFiles, readFile, writeFile, createFile, deleteFile, renameFile } = require('../files');
const { getUpload, listMedia, deleteMedia, mediaRoot, optimizeImage } = require('../images');
const path = require('path');

// ── GitHub Actions workflow template ───────────────────────────────────────

const WORKFLOW = `name: Build 11ty → /docs

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - '.eleventy.js'
      - 'eleventy.config.js'
      - 'package.json'
      - 'package-lock.json'

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx @11ty/eleventy --output=docs
      - name: Commit /docs if changed
        run: |
          git config user.name  "11ty CMS Bot"
          git config user.email "cms-bot@noreply.github.com"
          git add docs/
          git diff --staged --quiet || git commit -m "build: update /docs [skip ci]"
          git push
`;

// ── Sites ──────────────────────────────────────────────────────────────────

// List all sites, annotated with whether the repo is cloned locally
router.get('/sites', (req, res) => {
  try {
    const sites = loadSites().map(s => ({
      ...s,
      cloned: fs.existsSync(path.join(repoPath(s.id), '.git'))
    }));
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a new site
router.post('/sites', (req, res) => {
  const { name, repo, contentDir, mediaDir, branch, liveUrl } = req.body;
  if (!name || !repo) return res.status(400).json({ error: 'name and repo are required' });

  // Derive a stable ID from the name
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const sites = loadSites();
  if (sites.find(s => s.id === id)) {
    return res.status(409).json({ error: `Site ID "${id}" already exists` });
  }

  const newSite = {
    id,
    name,
    repo,
    contentDir: contentDir || 'src',
    mediaDir:   mediaDir   || 'src/images',
    branch:     branch     || 'main',
    ...(liveUrl && { liveUrl })
  };

  sites.push(newSite);
  saveSites(sites);
  res.status(201).json(newSite);
});

// Remove a site from config (does not delete the local clone)
router.delete('/sites/:id', (req, res) => {
  const sites = loadSites();
  const idx = sites.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Site not found' });
  sites.splice(idx, 1);
  saveSites(sites);
  res.json({ ok: true });
});

// Clone the repo (or pull) and write the GitHub Actions workflow if absent
router.post('/sites/:id/init', async (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });

  try {
    const gitResult = await cloneOrPull(site);

    const workflowPath = path.join(repoPath(site.id), '.github', 'workflows', 'build.yml');
    let workflowStatus;

    if (fs.existsSync(workflowPath)) {
      workflowStatus = 'existed';
    } else {
      fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
      fs.writeFileSync(workflowPath, WORKFLOW, 'utf8');
      workflowStatus = 'added';
    }

    res.json({ ...gitResult, workflowStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sites/:id/pull', async (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    const result = await cloneOrPull(site);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sites/:id/status', async (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    res.json(await getStatus(site.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Files ──────────────────────────────────────────────────────────────────

router.get('/sites/:id/files', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    res.json(listFiles(site));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Wildcard file routes — must use req.params[0]
router.get('/sites/:id/files/*', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    res.json(readFile(site, req.params[0]));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.put('/sites/:id/files/*', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const { frontmatter, body } = req.body;
  try {
    writeFile(site, req.params[0], frontmatter, body);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sites/:id/files', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const { path: filePath, frontmatter, body } = req.body;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  try {
    createFile(site, filePath, frontmatter, body);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sites/:id/files-rename', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const { from, to } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
  try {
    renameFile(site, from, to);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/sites/:id/files/*', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    deleteFile(site, req.params[0]);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Media ──────────────────────────────────────────────────────────────────

router.get('/sites/:id/media', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    res.json(listMedia(site));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sites/:id/media', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const upload = getUpload(site).single('file');
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    await optimizeImage(path.join(mediaRoot(site), req.file.filename));
    res.status(201).json({ filename: req.file.filename });
  });
});

// Serve a media file for preview (authenticated)
router.get('/sites/:id/media/:filename', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const dir = mediaRoot(site);
  const absPath = path.resolve(dir, req.params.filename);
  if (!absPath.startsWith(dir + path.sep)) return res.status(400).json({ error: 'Invalid filename' });
  res.sendFile(absPath);
});

router.delete('/sites/:id/media/:filename', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    deleteMedia(site, req.params.filename);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Git log per file ───────────────────────────────────────────────────────

router.get('/sites/:id/git-log/*', async (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    const repoRelPath = path.join(site.contentDir || 'src', req.params[0]);
    res.json(await getFileLog(site.id, repoRelPath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Frontmatter defaults ───────────────────────────────────────────────────

router.get('/sites/:id/defaults', (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json(site.frontmatterDefaults || {});
});

router.put('/sites/:id/defaults', (req, res) => {
  const sites = loadSites();
  const idx = sites.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Site not found' });
  sites[idx].frontmatterDefaults = req.body;
  saveSites(sites);
  res.json({ ok: true });
});

// ── Publish ────────────────────────────────────────────────────────────────

router.post('/sites/:id/publish', async (req, res) => {
  const site = getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const { message } = req.body;
  try {
    await commitAndPush(site.id, site.branch || 'main', message);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
