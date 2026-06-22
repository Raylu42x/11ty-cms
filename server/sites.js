const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/sites.json');

function loadSites() {
  if (!fs.existsSync(CONFIG_PATH)) return [];
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function getSite(id) {
  return loadSites().find((s) => s.id === id) || null;
}

function repoPath(siteId) {
  const base = process.env.REPOS_DIR || path.join(__dirname, '../repos');
  return path.join(base, siteId);
}

function saveSites(sites) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(sites, null, 2) + '\n', 'utf8');
}

module.exports = { loadSites, saveSites, getSite, repoPath };
