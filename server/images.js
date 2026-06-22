const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { repoPath } = require('./sites');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

function mediaRoot(site) {
  return path.join(repoPath(site.id), site.mediaDir || 'src/images');
}

function getUpload(site) {
  const dest = mediaRoot(site);
  fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: dest,
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, safe);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
      else cb(new Error(`File type not allowed: ${file.mimetype}`));
    },
  });
}

function listMedia(site) {
  const dir = mediaRoot(site);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
}

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.svg', '.gif'].includes(ext)) return;
  try {
    const sharp = require('sharp');
    const buf = await sharp(filePath).resize({ width: 2400, withoutEnlargement: true }).toBuffer();
    fs.writeFileSync(filePath, buf);
  } catch {
    /* sharp not installed or unsupported format — skip */
  }
}

function deleteMedia(site, filename) {
  const dir = mediaRoot(site);
  const absPath = path.resolve(dir, filename);
  if (!absPath.startsWith(dir + path.sep)) throw new Error('Path traversal denied');
  fs.unlinkSync(absPath);
}

module.exports = { getUpload, listMedia, deleteMedia, mediaRoot, optimizeImage };
