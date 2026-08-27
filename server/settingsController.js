import asyncHandler from 'express-async-handler';
import Settings from './Settings.js';
import { parseAcademicTermLabel } from './academicTermUtils.js';
import {
  advanceAcademicTerm,
  buildTermTransitionPreview,
} from './services/termTransitionService.js';

// @desc    Get settings
// @route   GET /api/settings
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.json(settings);
});

// @desc    Update settings
// @route   PUT /api/settings
const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
  }
  
  if (req.body.activeTerm !== undefined && req.body.activeTerm !== settings.activeTerm) {
    try {
      parseAcademicTermLabel(req.body.activeTerm);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(400).json({
      error: 'Use Academic Term Management to advance the active term safely.',
    });
  }
  settings.enrollmentOpen = req.body.enrollmentOpen !== undefined ? req.body.enrollmentOpen : settings.enrollmentOpen;
  settings.systemMaintenance = req.body.systemMaintenance !== undefined ? req.body.systemMaintenance : settings.systemMaintenance;
  settings.announcement = req.body.announcement !== undefined ? req.body.announcement : settings.announcement;

  const updatedSettings = await settings.save();
  res.json(updatedSettings);
});

const getTermTransitionPreview = asyncHandler(async (_req, res) => {
  res.json(await buildTermTransitionPreview());
});

// @desc    Advance to the next academic semester and process student archives
// @route   POST /api/settings/advance-semester
const advanceSemester = asyncHandler(async (req, res) => {
  const actor = req.user?.username || req.user?.email || 'System Admin';
  res.json(await advanceAcademicTerm(req.body.expectedCurrentTerm, actor));
});

export { getSettings, updateSettings, getTermTransitionPreview, advanceSemester };
