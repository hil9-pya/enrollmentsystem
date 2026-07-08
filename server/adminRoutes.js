import express from 'express';
import {
  getStudents,
  approveAdmission,
  rejectAdmission,
  approveAdvising,
  confirmPayment,
  validateEnrollment,
  setSubjects,
} from './studentsController.js';
import { protect, authorize } from './authMiddleware.js';

const router = express.Router();

// Enforce JWT authentication on all admin/staff routes
router.use(protect);

// GET /api/admin/students - List all student applications (allowed for all staff roles)
router.get('/', authorize('admin', 'admission', 'adviser', 'accounting', 'registrar'), getStudents);

// Department-specific actions
router.post('/:id/approve-admission', authorize('admin', 'admission'), approveAdmission);
router.post('/:id/reject-admission', authorize('admin', 'admission'), rejectAdmission);
router.post('/:id/approve-advising', authorize('admin', 'adviser'), approveAdvising);
router.post('/:id/subjects', authorize('admin', 'adviser'), setSubjects);
router.post('/:id/confirm-payment', authorize('admin', 'accounting'), confirmPayment);
router.post('/:id/validate-enrollment', authorize('admin', 'registrar'), validateEnrollment);

export default router;
