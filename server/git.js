const simpleGit = require('simple-git');
const fs = require('fs');
const { repoPath } = require('./sites');

function getGit(siteId) {
  const dir = repoPath(siteId);
  return simpleGit(dir, {
    config: [
      `user.name=${process.env.GIT_USER_NAME || '11ty CMS'}`,
      `user.email=${process.env.GIT_USER_EMAIL || 'cms@localhost'}`,
    ]
  });
}

function buildRemoteUrl(repoUrl) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return repoUrl;
  return repoUrl.replace('https://', `https://${token}@`);
}

async function cloneOrPull(site) {
  const dir = repoPath(site.id);
  const remoteUrl = buildRemoteUrl(site.repo);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    await simpleGit().clone(remoteUrl, dir, ['--branch', site.branch || 'main']);
    return { action: 'cloned' };
  }

  const git = getGit(site.id);
  await git.pull('origin', site.branch || 'main');
  return { action: 'pulled' };
}

async function getStatus(siteId) {
  const git = getGit(siteId);
  const st = await git.status();
  const log = await git.log({ maxCount: 1 });
  return {
    modified: st.modified,
    created: st.created,
    not_added: st.not_added,
    deleted: st.deleted,
    staged: st.staged,
    lastCommit: log.latest
  };
}

async function commitAndPush(siteId, branch, message) {
  const git = getGit(siteId);
  const site = require('./sites').getSite(siteId);
  const remoteUrl = buildRemoteUrl(site.repo);
  await git.remote(['set-url', 'origin', remoteUrl]);
  await git.add('.');
  await git.commit(message || `cms: update content ${new Date().toISOString()}`);
  // Pull remote changes (rebase) before pushing to avoid rejection
  await git.pull('origin', branch || 'main', { '--rebase': 'true' });
  await git.push('origin', branch || 'main');
}

async function getFileLog(siteId, repoRelPath, maxCount = 15) {
  const git = getGit(siteId);
  const log = await git.log({ file: repoRelPath, maxCount });
  return log.all.map(c => ({
    hash:    c.hash.slice(0, 7),
    date:    c.date,
    message: c.message,
    author:  c.author_name
  }));
}

module.exports = { cloneOrPull, getStatus, commitAndPush, getFileLog };
