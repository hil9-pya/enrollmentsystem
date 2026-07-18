import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  createDraft,
  applicantLogin,
  getStudents,
  getStudentById,
  registerStudent,
  updateStudent,
  submitDocuments,
  uploadDocument,
  removeDocument,
  selectProgram,
  setSubjects,
  processPayment,
  approveAdmission,
  rejectAdmission,
  approveAdvising,
  confirmPayment,
  validateEnrollment,
  proceedToPayment,
  rolloverStudent,
} from './studentsController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, matches the frontend's own limit

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const studentId = req.params.id || 'unknown';
    const typeId = req.body.typeId || 'document';
    const ext = path.extname(file.originalname) || '';
    cb(null, `${studentId}_${typeId}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'));
    }
    cb(null, true);
  },
});

const router = express.Router();

// NOTE: These routes intentionally have no auth requirement, matching how
// the Student Portal has always worked in this app — applicants use it
// without logging in (see StudentPortalAccess.jsx "Demo Profiles / bypass
// verification"). Staff (admission/adviser/accounting/registrar/admin)
// reach the same endpoints from the logged-in Admin Portal.

router.post('/draft', createDraft);
router.post('/applicant-login', applicantLogin);
router.post('/register', registerStudent);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);

router.post('/:id/submit-documents', submitDocuments);
router.post('/:id/documents', upload.single('file'), uploadDocument);
router.delete('/:id/documents/:typeId', removeDocument);

router.post('/:id/select-program', selectProgram);
router.post('/:id/subjects', setSubjects);

router.post('/:id/proceed-to-payment', proceedToPayment);
router.post('/:id/payment', processPayment);
router.post('/:id/rollover', rolloverStudent);

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
