const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `u${req.user?.id || 'x'}-${Date.now()}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const ok = ['image/jpeg','image/png','image/webp','image/jpg'].includes(file.mimetype);
  cb(ok ? null : new Error('Only JPG/PNG/WEBP images allowed'), ok);
};

exports.uploadPhoto = multer({ storage, fileFilter, limits: { fileSize: 3 * 1024 * 1024 } }).single('photo');