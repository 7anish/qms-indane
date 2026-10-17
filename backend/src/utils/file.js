const fs = require('fs');
const path = require('path');
const { UPLOAD_ROOT } = require('../config/upload');

// Build the metadata stored in Mongo from a multer file object
const toFileMeta = (file) => {
  const relPath = path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/');
  return {
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: relPath,
    url: `/uploads/${relPath}`,
  };
};

// Delete a stored file by its path relative to the uploads root. Never throws.
const deleteStoredFile = async (relPath) => {
  if (!relPath) return;
  const abs = path.resolve(UPLOAD_ROOT, relPath);
  if (!abs.startsWith(UPLOAD_ROOT + path.sep)) return;
  try {
    await fs.promises.unlink(abs);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Failed to delete file ${abs}:`, err.message);
  }
};

// Remove every file multer saved for this request (used when a request fails)
const cleanupRequestFiles = async (req) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files) Object.values(req.files).forEach((list) => files.push(...list));

  await Promise.all(
    files.map((f) => fs.promises.unlink(f.path).catch(() => {}))
  );
};

module.exports = { toFileMeta, deleteStoredFile, cleanupRequestFiles };
