import asyncHandler from 'express-async-handler';
import Settings from './Settings.js';

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
  
  settings.activeTerm = req.body.activeTerm !== undefined ? req.body.activeTerm : settings.activeTerm;
  settings.enrollmentOpen = req.body.enrollmentOpen !== undefined ? req.body.enrollmentOpen : settings.enrollmentOpen;
  settings.systemMaintenance = req.body.systemMaintenance !== undefined ? req.body.systemMaintenance : settings.systemMaintenance;
  settings.announcement = req.body.announcement !== undefined ? req.body.announcement : settings.announcement;

  const updatedSettings = await settings.save();
  res.json(updatedSettings);
});

export { getSettings, updateSettings };
