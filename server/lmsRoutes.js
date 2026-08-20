import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import express from 'express';
import { protect, authorize } from './authMiddleware.js';
import {
  LMS_MAX_FILE_SIZE_BYTES,
  LMS_UPLOADS_DIRECTORY,
  validateLmsUploadMetadata,
} from './services/lmsStorageService.js';
import {
  auditLmsStorage,
  authorizeMaterialUpload,
  authorizeSubmissionUpload,
  createAssignment,
  createAnnouncement,
  createMaterial,
  deleteAnnouncement,
  deleteMaterial,
  deleteAssignment,
  downloadSubmission,
  downloadSubmissionAttempt,
  downloadMaterial,
  getLmsDashboard,
  getLmsClass,
  getOfferingGradebook,
  listAnnouncements,
  listMaterials,
  listLmsNotifications,
  listAssignments,
  listLmsAssignmentsOverview,
  listAssignmentSubmissions,
  gradeSubmission,
  returnSubmission,
  searchLms,
  markAllLmsNotificationsRead,
  markLmsNotificationRead,
  setOfferingLmsStatus,
  submitAssignment,
  updateAssignment,
  validateLmsUploadedFile,
} from './lmsController.js';

fs.mkdirSync(LMS_UPLOADS_DIRECTORY, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, LMS_UPLOADS_DIRECTORY),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const ownerId = String(req.params.offeringId || req.params.assignmentId || 'lms').replace(/[^a-zA-Z0-9_-]/g, '');
    callback(null, `${ownerId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: LMS_MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    try {
      validateLmsUploadMetadata(file);
      callback(null, true);
    } catch (error) {
      callback(error);
    }
  },
});

const router = express.Router();
router.use(protect);

router.get('/dashboard', authorize('student', 'instructor', 'admin'), getLmsDashboard);
router.get('/search', authorize('student', 'instructor', 'admin'), searchLms);
router.get('/assignments', authorize('student', 'instructor', 'admin'), listLmsAssignmentsOverview);
router.get('/notifications', authorize('student', 'instructor', 'admin'), listLmsNotifications);
router.get('/storage/audit', authorize('admin'), auditLmsStorage);
router.patch('/notifications/read-all', authorize('student', 'instructor', 'admin'), markAllLmsNotificationsRead);
router.patch('/notifications/:id/read', authorize('student', 'instructor', 'admin'), markLmsNotificationRead);
router.get('/offerings/:offeringId', authorize('student', 'instructor', 'admin'), getLmsClass);
router.patch('/offerings/:offeringId/status', authorize('admin'), setOfferingLmsStatus);
router.get('/offerings/:offeringId/announcements', authorize('student', 'instructor', 'admin'), listAnnouncements);
router.post('/offerings/:offeringId/announcements', authorize('instructor', 'admin'), createAnnouncement);
router.delete('/announcements/:id', authorize('instructor', 'admin'), deleteAnnouncement);
router.get('/offerings/:offeringId/materials', authorize('student', 'instructor', 'admin'), listMaterials);
router.post(
  '/offerings/:offeringId/materials',
  authorize('instructor', 'admin'),
  authorizeMaterialUpload,
  upload.single('file'),
  validateLmsUploadedFile,
  createMaterial
);
router.get('/materials/:id/download', authorize('student', 'instructor', 'admin'), downloadMaterial);
router.delete('/materials/:id', authorize('instructor', 'admin'), deleteMaterial);
router.get('/offerings/:offeringId/assignments', authorize('student', 'instructor', 'admin'), listAssignments);
router.get('/offerings/:offeringId/gradebook', authorize('instructor', 'admin'), getOfferingGradebook);
router.post('/offerings/:offeringId/assignments', authorize('instructor', 'admin'), createAssignment);
router.patch('/assignments/:id', authorize('instructor', 'admin'), updateAssignment);
router.delete('/assignments/:id', authorize('instructor', 'admin'), deleteAssignment);
router.post(
  '/assignments/:assignmentId/submissions',
  authorize('student'),
  authorizeSubmissionUpload,
  upload.single('file'),
  validateLmsUploadedFile,
  submitAssignment
);
router.get('/assignments/:assignmentId/submissions', authorize('instructor', 'admin'), listAssignmentSubmissions);
router.patch('/submissions/:id/grade', authorize('instructor', 'admin'), gradeSubmission);
router.patch('/submissions/:id/return', authorize('instructor', 'admin'), returnSubmission);
router.get('/submissions/:id/download', authorize('student', 'instructor', 'admin'), downloadSubmission);
router.get('/submissions/:id/attempts/:attemptId/download', authorize('student', 'instructor', 'admin'), downloadSubmissionAttempt);
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error?.message?.startsWith('Unsupported file type')) {
    res.status(400).json({ success: false, message: error.message || 'Upload failed.' });
    return;
  }
  next(error);
});

export default router;
