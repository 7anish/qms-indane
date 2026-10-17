const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

const UPLOAD_DIRS = Object.freeze({
  COMPANIES: 'companies',
  IMPORTS: 'imports',
  PRODUCTS: 'products',
  QUOTATIONS: 'quotations',
});

Object.values(UPLOAD_DIRS).forEach((dir) => {
  fs.mkdirSync(path.join(UPLOAD_ROOT, dir), { recursive: true });
});

const MIME = Object.freeze({
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

module.exports = {
  UPLOAD_ROOT,
  UPLOAD_DIRS,
  MIME,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB
};
