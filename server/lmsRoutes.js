import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import express from 'express';
import { protect, authorize } from './authMiddleware.js';
import {
  LMS_UPLOADS_DIRECTORY,
  authorizeMaterialUpload,
  createAnnouncement,
  createMaterial,
  deleteAnnouncement,
  deleteMaterial,
  downloadMaterial,
  getLmsClass,
  listAnnouncements,
  listMaterials,
  setOfferingLmsStatus,
} from './lmsController.js';

fs.mkdirSync(LMS_UPLOADS_DIRECTORY, { recursive: true });

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-zip-compressed',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, LMS_UPLOADS_DIRECTORY),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    callback(null, `${req.params.offeringId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error('Unsupported file type. Upload PDF, Office, text, image, or ZIP files.'));
    }
    callback(null, true);
  },
});

const router = express.Router();
router.use(protect);

router.get('/offerings/:offeringId', authorize('student', 'instructor', 'registrar', 'admin'), getLmsClass);
router.patch('/offerings/:offeringId/status', authorize('admin'), setOfferingLmsStatus);
router.get('/offerings/:offeringId/announcements', authorize('student', 'instructor', 'registrar', 'admin'), listAnnouncements);
router.post('/offerings/:offeringId/announcements', authorize('instructor', 'admin'), createAnnouncement);
router.delete('/announcements/:id', authorize('instructor', 'admin'), deleteAnnouncement);
router.get('/offerings/:offeringId/materials', authorize('student', 'instructor', 'registrar', 'admin'), listMaterials);
router.post(
  '/offerings/:offeringId/materials',
  authorize('instructor', 'admin'),
  authorizeMaterialUpload,
  upload.single('file'),
  createMaterial
);
router.get('/materials/:id/download', authorize('student', 'instructor', 'registrar', 'admin'), downloadMaterial);
router.delete('/materials/:id', authorize('instructor', 'admin'), deleteMaterial);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error?.message?.startsWith('Unsupported file type')) {
    res.status(400).json({ success: false, message: error.message || 'Upload failed.' });
    return;
  }
  next(error);
});

export default router;
