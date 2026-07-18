import express from 'express';
import { getSettings, updateSettings } from './settingsController.js';
import { protect, authorize } from './authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getSettings) // public so applicants can see if enrollment is open
  .put(protect, authorize('admin'), updateSettings);

export default router;
