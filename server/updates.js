const { version } = require('../package.json');

const REPO = process.env.UPDATE_CHECK_REPO || 'Raylu42x/11ty-cms';
const ENABLED = process.env.UPDATE_CHECK_ENABLED === 'true';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day

let cache = { current: version, latest: null, updateAvailable: false, checkedAt: null };
let timer = null;

function parseVersion(v) {
  if (!v) return null;
  const m = String(v)
    .replace(/^v/, '')
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function isNewer(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

async function checkOnce() {
  if (!ENABLED) return cache;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': '11ty-cms-update-check', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return cache;
    const data = await res.json();
    const latest = data.tag_name || data.name;
    cache = {
      current: version,
      latest,
      updateAvailable: isNewer(latest, version),
      url: data.html_url,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    // network errors are silent — update check is best-effort
  }
  return cache;
}

function start() {
  if (!ENABLED || timer) return;
  checkOnce();
  timer = setInterval(checkOnce, CHECK_INTERVAL_MS);
  if (timer.unref) timer.unref();
}

function getStatus() {
  return { ...cache, enabled: ENABLED };
}

module.exports = { start, getStatus, checkOnce, _isNewer: isNewer };
