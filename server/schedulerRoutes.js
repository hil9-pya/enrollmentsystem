import express from 'express';
import { protect, authorize } from './authMiddleware.js';
import { protectStudentRecord } from './studentAccessMiddleware.js';
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

// Student routes require record ownership; staff access remains role-authenticated.
router.get('/:studentId/subjects', protectStudentRecord, getSchedulerSubjects);
router.get('/:studentId/enrolled', protectStudentRecord, getEnrolledSchedule);
router.get('/:studentId/sections/:subjectId', protectStudentRecord, getSubjectSections);
router.post('/:studentId/add', protectStudentRecord, addSchedulerSection);
router.post('/:studentId/remove', protectStudentRecord, removeSchedulerSection);
router.post('/:studentId/submit', protectStudentRecord, submitSchedule);

export default router;
