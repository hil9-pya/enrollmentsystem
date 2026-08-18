import express from 'express';
import { protect, authorize } from './authMiddleware.js';
import {
  activateAcademicTerm,
  assignOfferingInstructor,
  createAcademicTerm,
  getMyClasses,
  getOfferingRoster,
  listAcademicTerms,
  listCourseOfferings,
  updateAcademicTerm,
  submitFinalGrade,
  listSubmittedGrades,
  reviewFinalGrade,
  publishFinalGrade,
  updateMembershipStatus,
  getAcademicIntegrityAudit,
} from './academicController.js';

const router = express.Router();
router.use(protect);

router.get('/terms', authorize('student', 'instructor', 'adviser', 'registrar', 'admin'), listAcademicTerms);
router.post('/terms', authorize('admin'), createAcademicTerm);
router.put('/terms/:id', authorize('admin'), updateAcademicTerm);
router.post('/terms/:id/activate', authorize('admin'), activateAcademicTerm);

router.get('/my-classes', authorize('student', 'instructor', 'registrar', 'admin'), getMyClasses);
router.get('/offerings', authorize('instructor', 'adviser', 'registrar', 'admin'), listCourseOfferings);
router.get('/integrity-audit', authorize('admin'), getAcademicIntegrityAudit);
router.get('/offerings/:id/roster', authorize('instructor', 'registrar', 'admin'), getOfferingRoster);
router.put('/offerings/:id/instructor', authorize('registrar', 'admin'), assignOfferingInstructor);

router.get('/grades', authorize('registrar', 'admin'), listSubmittedGrades);
router.post('/memberships/:id/grade/submit', authorize('instructor', 'admin'), submitFinalGrade);
router.post('/memberships/:id/grade/review', authorize('registrar', 'admin'), reviewFinalGrade);
router.post('/memberships/:id/grade/publish', authorize('registrar', 'admin'), publishFinalGrade);
router.patch('/memberships/:id/status', authorize('registrar', 'admin'), updateMembershipStatus);

export default router;
