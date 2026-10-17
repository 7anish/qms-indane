const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { UPLOAD_ROOT, UPLOAD_DIRS, MIME, MAX_FILE_SIZE } = require('../config/upload');

const EXT_BY_MIME = {
  [MIME.PDF]: '.pdf',
  [MIME.JPEG]: '.jpg',
  [MIME.PNG]: '.png',
  [MIME.WEBP]: '.webp',
};

const DOC_TYPES = [MIME.PDF, MIME.JPEG, MIME.PNG];
const IMAGE_TYPES = [MIME.JPEG, MIME.PNG, MIME.WEBP];

const storageFor = (subDir) =>
  multer.diskStorage({
    destination: path.join(UPLOAD_ROOT, subDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      cb(null, `${file.fieldname}-${unique}${EXT_BY_MIME[file.mimetype]}`);
    },
  });

// allowed: { fieldName: [mimeTypes] }
const fileFilterFor = (allowed) => (req, file, cb) => {
  const types = allowed[file.fieldname];
  if (!types) return cb(ApiError.badRequest(`Unexpected file field: ${file.fieldname}`));
  if (!types.includes(file.mimetype)) {
    const exts = types.map((t) => EXT_BY_MIME[t]).join(', ');
    return cb(ApiError.badRequest(`${file.fieldname}: only ${exts} files are allowed`));
  }
  cb(null, true);
};

const createUploader = (subDir, allowed) =>
  multer({
    storage: storageFor(subDir),
    limits: { fileSize: MAX_FILE_SIZE, files: Object.keys(allowed).length },
    fileFilter: fileFilterFor(allowed),
  }).fields(Object.keys(allowed).map((name) => ({ name, maxCount: 1 })));

const companyDocsUpload = createUploader(UPLOAD_DIRS.COMPANIES, {
  gstCertificate: DOC_TYPES,
  panFront: IMAGE_TYPES,
  panBack: IMAGE_TYPES,
  msmeCertificate: DOC_TYPES,
});

const productImageUpload = createUploader(UPLOAD_DIRS.PRODUCTS, {
  image: IMAGE_TYPES,
});

// Excel import: some browsers/OSes send .xlsx as octet-stream or with no type, so check the extension too
const XLSX_FALLBACK_TYPES = [MIME.XLSX, 'application/octet-stream', ''];

const excelImportUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOAD_ROOT, UPLOAD_DIRS.IMPORTS),
    filename: (req, file, cb) => {
      cb(null, `import-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.xlsx`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const isXlsx =
      path.extname(file.originalname).toLowerCase() === '.xlsx' && XLSX_FALLBACK_TYPES.includes(file.mimetype);
    if (!isXlsx) return cb(ApiError.badRequest('Only .xlsx Excel files are allowed'));
    cb(null, true);
  },
}).single('file');

module.exports = { companyDocsUpload, productImageUpload, excelImportUpload };
