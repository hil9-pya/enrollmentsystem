import express from 'express';
import { protect, authorize } from './authMiddleware.js';
import {
  getSchedulerSubjects,
  getEnrolledSchedule,
  getSubjectSections,
  addSchedulerSection,
  removeSchedulerSection,
  submitSchedule,
} from './schedulerController.js';
import {
  listSections,
  createSection,
  updateSection,
  deleteSection,
  listSubjectsForAdmin,
  createSubject,
} from './adminSchedulerController.js';

const router = express.Router();

// ── Admin/Registrar routes (JWT required, role: admin | registrar | admission) ──
const adminRoles = ['admin', 'registrar', 'admission'];
router.get('/admin/subjects', protect, authorize(...adminRoles), listSubjectsForAdmin);
router.post('/admin/subjects', protect, authorize(...adminRoles), createSubject);
router.get('/admin/sections', protect, authorize(...adminRoles), listSections);
router.post('/admin/sections', protect, authorize(...adminRoles), createSection);
router.put('/admin/sections/:id', protect, authorize(...adminRoles), updateSection);
router.delete('/admin/sections/:id', protect, authorize(...adminRoles), deleteSection);

// ── Student-facing routes (no auth required — studentId is in the URL/body) ──
router.get('/:studentId/subjects', getSchedulerSubjects);
router.get('/:studentId/enrolled', getEnrolledSchedule);
router.get('/:studentId/sections/:subjectId', getSubjectSections);
router.post('/:studentId/add', addSchedulerSection);
router.post('/:studentId/remove', removeSchedulerSection);
router.post('/:studentId/submit', submitSchedule);

export default router;
