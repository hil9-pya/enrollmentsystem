import express from 'express';
import {
  getSettings,
  updateSettings,
  getTermTransitionPreview,
  advanceSemester,
} from './settingsController.js';
import { protect, authorize } from './authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getSettings) // public so applicants can see if enrollment is open
  .put(protect, authorize('admin'), updateSettings);

router.get('/term-transition-preview', protect, authorize('admin'), getTermTransitionPreview);
router.post('/advance-semester', protect, authorize('admin'), advanceSemester);

export default router;
