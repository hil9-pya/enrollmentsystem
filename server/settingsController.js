import asyncHandler from 'express-async-handler';
import Settings from './Settings.js';
import mongoose from 'mongoose';
import { ensureAcademicTerm } from './services/academicFoundationService.js';
import { nextAcademicTermLabel, parseAcademicTermLabel } from './academicTermUtils.js';

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
  
  let requestedTerm = settings.activeTerm;
  if (req.body.activeTerm !== undefined) {
    try {
      requestedTerm = parseAcademicTermLabel(req.body.activeTerm).name;
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
  const activeTermChanged = requestedTerm !== settings.activeTerm;
  settings.activeTerm = requestedTerm;
  settings.enrollmentOpen = req.body.enrollmentOpen !== undefined ? req.body.enrollmentOpen : settings.enrollmentOpen;
  settings.systemMaintenance = req.body.systemMaintenance !== undefined ? req.body.systemMaintenance : settings.systemMaintenance;
  settings.announcement = req.body.announcement !== undefined ? req.body.announcement : settings.announcement;

  const updatedSettings = await settings.save();
  if (activeTermChanged) await ensureAcademicTerm(updatedSettings.activeTerm, { activate: true });
  res.json(updatedSettings);
});

// @desc    Advance to the next academic semester and process student archives
// @route   POST /api/settings/advance-semester
const advanceSemester = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();

  const oldTerm = settings.activeTerm || '1st Semester 2026-2027';
  const newTerm = nextAcademicTermLabel(oldTerm);
  
  settings.activeTerm = newTerm;
  await settings.save();
  await ensureAcademicTerm(newTerm, { activate: true });

  // Process all students
  const Student = mongoose.model('Student');
  const allStudents = await Student.find({ isDeleted: { $ne: true } });

  for (const student of allStudents) {
    let updateDoc = {};
    if (student.status === 'enrolled' && student.academicTerm === oldTerm) {
      // Successfully completed the term that just ended, reset strikes
      updateDoc = { 
        $set: { 
          missedSemesters: 0, 
          lastEnrolledTerm: oldTerm 
        } 
      };
    } else {
      // Missed the term (either not enrolled, or enrolled in a past term and never rolled over)
      const newMissed = (student.missedSemesters || 0) + 1;
      updateDoc = { $set: { missedSemesters: newMissed } };
      
      if (newMissed >= 2) {
        updateDoc.$set.isDeleted = true;
        updateDoc.$push = {
          auditLogs: {
            action: 'Auto-archived due to missing 2 consecutive semesters',
            user: 'System Admin',
            date: new Date()
          }
        };
      }
    }
    await Student.updateOne({ _id: student._id }, updateDoc);
  }

  res.json({ message: 'Semester advanced successfully', newTerm, settings });
});

export { getSettings, updateSettings, advanceSemester };
