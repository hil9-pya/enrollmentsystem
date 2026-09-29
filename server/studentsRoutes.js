import express from 'express';
import multer from 'multer';
import {
  createDraft,
  applicantLogin,
  checkEmailAvailability,
  sendEmailVerificationOtp,
  verifyEmailOtp,
  getStudentById,
  registerStudent,
  updateStudent,
  submitDocuments,
  uploadDocument,
  removeDocument,
  getDocumentFile,
  selectProgram,
  processPayment,
  proceedToPayment,
  createPaymongoCheckoutSession,
  verifyPaymongoPayment,
  joinWalkInQueue,
} from './studentsController.js';
import { protectStudentRecord } from './studentAccessMiddleware.js';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, matches the frontend's own limit

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.post('/draft', createDraft);
router.post('/applicant-login', applicantLogin);
router.post('/register', registerStudent);
router.get('/email-availability', checkEmailAvailability);
router.post('/:id/email-verification/send', protectStudentRecord, sendEmailVerificationOtp);
router.post('/:id/email-verification/verify', protectStudentRecord, verifyEmailOtp);
router.get('/:id', protectStudentRecord, getStudentById);
router.put('/:id', protectStudentRecord, updateStudent);

router.post('/:id/submit-documents', protectStudentRecord, submitDocuments);
router.post('/:id/documents', protectStudentRecord, upload.single('file'), uploadDocument);
router.get('/:id/documents/:typeId/file', protectStudentRecord, getDocumentFile);
router.delete('/:id/documents/:typeId', protectStudentRecord, removeDocument);

router.post('/:id/select-program', protectStudentRecord, selectProgram);

router.post('/:id/proceed-to-payment', protectStudentRecord, proceedToPayment);
router.post('/:id/payment', protectStudentRecord, processPayment);
router.post('/:id/walk-in-queue', protectStudentRecord, joinWalkInQueue);
router.post('/:id/paymongo-checkout', protectStudentRecord, createPaymongoCheckoutSession);
router.get('/:id/verify-paymongo-payment', protectStudentRecord, verifyPaymongoPayment);
// Surface multer errors (bad file type / too large) as normal JSON errors
// instead of letting them bubble up as an unhandled exception.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    res.status(400).json({ error: err.message || 'Upload failed.' });
    return;
  }
  next();
});

export default router;
