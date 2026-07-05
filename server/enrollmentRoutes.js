import express from 'express';
import {
  createEnrollment,
  getMyEnrollments,
  getEnrollmentsByCourse,
} from './enrollmentController.js';
import { protect, authorize } from './authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('student'), createEnrollment);

router.route('/myenrollments').get(protect, authorize('student'), getMyEnrollments);

router
  .route('/course/:courseId')
  .get(protect, authorize('instructor', 'admin'), getEnrollmentsByCourse);

export default router;