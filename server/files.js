const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { repoPath } = require('./sites');

const EDITABLE_EXTENSIONS = ['.md', '.njk', '.html'];

function contentRoot(site) {
  return path.join(repoPath(site.id), site.contentDir || 'src');
}

function resolveSafe(site, relativePath) {
  const root = contentRoot(site);
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error('Path traversal denied');
  }
  return resolved;
}

function listFiles(site) {
  const root = contentRoot(site);
  const results = [];

  function walk(dir, base) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        // Skip 11ty special dirs
        if (!entry.name.startsWith('_')) walk(path.join(dir, entry.name), rel);
      } else if (EDITABLE_EXTENSIONS.includes(path.extname(entry.name))) {
        results.push(rel);
      }
    }
  }

  walk(root, '');
  return results;
}

function readFile(site, relativePath) {
  const absPath = resolveSafe(site, relativePath);
  const raw = fs.readFileSync(absPath, 'utf8');
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data,
    body: parsed.content,
    ext: path.extname(relativePath)
  };
}

function writeFile(site, relativePath, frontmatter, body) {
  const absPath = resolveSafe(site, relativePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  // gray-matter stringify: puts frontmatter back as YAML, then body
  const content = matter.stringify(body ?? '', frontmatter ?? {});
  fs.writeFileSync(absPath, content, 'utf8');
}

function createFile(site, relativePath, frontmatter, body) {
  const absPath = resolveSafe(site, relativePath);
  if (fs.existsSync(absPath)) throw new Error('File already exists');
  writeFile(site, relativePath, frontmatter, body);
}

function deleteFile(site, relativePath) {
  const absPath = resolveSafe(site, relativePath);
  fs.unlinkSync(absPath);
}

function renameFile(site, oldPath, newPath) {
  const oldAbs = resolveSafe(site, oldPath);
  const newAbs = resolveSafe(site, newPath);
  if (!fs.existsSync(oldAbs)) throw new Error('File not found');
  if (fs.existsSync(newAbs)) throw new Error('A file already exists at that path');
  fs.mkdirSync(path.dirname(newAbs), { recursive: true });
  fs.renameSync(oldAbs, newAbs);
}

module.exports = { listFiles, readFile, writeFile, createFile, deleteFile, renameFile };
