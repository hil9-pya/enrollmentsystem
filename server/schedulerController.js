import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Student from './Student.js';
import Section from './models/Section.js';
import { computeTuition, SUBJECTS_CATALOG } from './subjectsCatalog.js';
import {
  getCurriculumSubjects,
  enrichSubjectWithLiveSections,
  getResolvedEnrolledSchedule,
  validateAddSection,
} from './services/schedulerService.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function semesterLabel(label) {
  if (!label) return 1;
  if (label.includes('2nd') || label.includes('2S') || label === '2') return 2;
  return 1;
}

async function getStudent(req, res) {
  const studentId = req.params.studentId || req.body.studentId;
  if (!studentId) {
    res.status(400).json({ success: false, message: 'studentId is required.' });
    return null;
  }
  const student = await Student.findOne({
    $or: [{ _id: studentId }, { studentId }],
    isDeleted: { $ne: true },
  });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return null;
  }
  return student;
}

// ---------------------------------------------------------------------------
// GET /api/scheduler/:studentId/subjects
// Return curriculum subjects for the student, enriched with live slot data,
// prereq status, and completion status.
// ---------------------------------------------------------------------------
export const getSchedulerSubjects = asyncHandler(async (req, res) => {
  const student = await getStudent(req, res);
  if (!student) return;

  const semNum = semesterLabel(student.academicTerm);
  const passedSubjectIds = (student.academicRecord || [])
    .filter((r) => r.grade <= 3.0) // passing grade ≤ 3.0 (Filipino grading system)
    .map((r) => r.subjectId);

  const curriculumSubjects = getCurriculumSubjects(
    student.programId,
    student.yearLevel || 1,
    semNum
  );

  const enriched = await Promise.all(
    curriculumSubjects.map(async (sub) => {
      const withLive = await enrichSubjectWithLiveSections(sub);
      const completed = passedSubjectIds.includes(sub.id);
      const missingPrereqs = completed
        ? []
        : (sub.prerequisites || []).filter((p) => !passedSubjectIds.includes(p));
      const prereqSatisfied = missingPrereqs.length === 0;

      // Resolve missing prereq names for display
      const missingPrereqNames = missingPrereqs.map((pid) => {
        const found = SUBJECTS_CATALOG.find((s) => s.id === pid);
        return found ? `${found.code} - ${found.name}` : pid;
      });

      return {
        ...withLive,
        completed,
        prereqSatisfied,
        missingPrereqNames,
        isElective: sub.programId === 'elective',
      };
    })
  );

  res.json({ success: true, data: enriched });
});

// GET /api/scheduler/:studentId/enrolled
// Return exact subjects and sections persisted on the student's enrollment.
export const getEnrolledSchedule = asyncHandler(async (req, res) => {
  const student = await getStudent(req, res);
  if (!student) return;

  const schedule = await getResolvedEnrolledSchedule(student.selectedSubjects || []);
  res.json({ success: true, data: schedule });
});

// ---------------------------------------------------------------------------
// GET /api/scheduler/:studentId/sections/:subjectId
// Get open sections for a specific subject with live slot counts.
// ---------------------------------------------------------------------------
export const getSubjectSections = asyncHandler(async (req, res) => {
  const student = await getStudent(req, res);
  if (!student) return;

  const { subjectId } = req.params;
  const subject = SUBJECTS_CATALOG.find((s) => s.id === subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found.' });
  }

  const enriched = await enrichSubjectWithLiveSections(subject);
  res.json({ success: true, data: enriched.sections || [] });
});

// ---------------------------------------------------------------------------
// POST /api/scheduler/:studentId/add
// Validate and add a section to the student's selected subjects.
// ---------------------------------------------------------------------------
export const addSchedulerSection = asyncHandler(async (req, res) => {
  const student = await getStudent(req, res);
  if (!student) return;

  if (student.scheduleStatus === 'finalized' || student.scheduleGenerated) {
    return res.status(409).json({ success: false, message: 'Finalized schedules are locked. Contact your adviser for changes.' });
  }

  const { subjectId, sectionId } = req.body;
  if (!subjectId || !sectionId) {
    return res.status(400).json({ success: false, message: 'subjectId and sectionId are required.' });
  }

  // Compute current units
  const currentTotalUnits = (student.selectedSubjects || []).reduce((sum, s) => {
    const sub = SUBJECTS_CATALOG.find((c) => c.id === s.subjectId);
    return sum + (sub?.units || 0);
  }, 0);

  // Build a simple schedule array for conflict checking
  const currentSections = (student.selectedSubjects || []).map((s) => ({
    subjectId: s.subjectId,
    sectionId: s.sectionId,
  }));

  const { valid, error } = await validateAddSection(
    currentSections,
    subjectId,
    sectionId,
    currentTotalUnits,
    student.overloadPermit || false
  );

  if (!valid) {
    return res.status(409).json({ success: false, message: error });
  }

  // Remove existing entry for the same subject (switch-section logic)
  student.selectedSubjects = (student.selectedSubjects || []).filter(
    (s) => s.subjectId !== subjectId
  );
  student.selectedSubjects.push({ subjectId, sectionId, addedAt: new Date() });

  const subjectIds = student.selectedSubjects.map((entry) => entry.subjectId);
  const { tuitionBreakdown, totalTuition } = computeTuition(subjectIds);
  student.tuitionBreakdown = tuitionBreakdown;
  student.totalTuition = totalTuition;

  await student.save();

  res.json({
    success: true,
    message: 'Section added successfully.',
    data: {
      selectedSubjects: student.selectedSubjects,
      tuitionBreakdown: student.tuitionBreakdown,
      totalTuition: student.totalTuition,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/scheduler/:studentId/remove
// Remove a subject from the student's selected subjects.
// ---------------------------------------------------------------------------
export const removeSchedulerSection = asyncHandler(async (req, res) => {
  const student = await getStudent(req, res);
  if (!student) return;

  if (student.scheduleStatus === 'finalized' || student.scheduleGenerated) {
    return res.status(409).json({ success: false, message: 'Finalized schedules are locked. Contact your adviser for changes.' });
  }

  const { subjectId } = req.body;
  if (!subjectId) {
    return res.status(400).json({ success: false, message: 'subjectId is required.' });
  }

  student.selectedSubjects = (student.selectedSubjects || []).filter(
    (s) => s.subjectId !== subjectId
  );

  const subjectIds = student.selectedSubjects.map((entry) => entry.subjectId);
  const { tuitionBreakdown, totalTuition } = computeTuition(subjectIds);
  student.tuitionBreakdown = tuitionBreakdown;
  student.totalTuition = totalTuition;

  await student.save();

  res.json({
    success: true,
    message: 'Section removed.',
    data: {
      selectedSubjects: student.selectedSubjects,
      tuitionBreakdown: student.tuitionBreakdown,
      totalTuition: student.totalTuition,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /api/scheduler/:studentId/submit
// Finalize the schedule — full server-side re-validation before locking.
// ---------------------------------------------------------------------------
export const submitSchedule = asyncHandler(async (req, res) => {
  const student = await getStudent(req, res);
  if (!student) return;

  if (student.scheduleStatus === 'finalized' || student.scheduleGenerated) {
    if (student.scheduleStatus !== 'finalized') {
      student.scheduleStatus = 'finalized';
      await student.save();
    }
    return res.json({
      success: true,
      message: 'Schedule was already finalized.',
      data: { selectedSubjects: student.selectedSubjects },
    });
  }

  const selected = student.selectedSubjects || [];
  if (selected.length === 0) {
    return res.status(400).json({ success: false, message: 'No subjects selected. Please add at least one subject.' });
  }

  // Full server-side re-validation from scratch
  let runningUnits = 0;
  const validatedSections = [];

  for (const entry of selected) {
    const { valid, error } = await validateAddSection(
      validatedSections,
      entry.subjectId,
      entry.sectionId,
      runningUnits,
      student.overloadPermit || false
    );

    if (!valid) {
      return res.status(409).json({
        success: false,
        message: `Schedule validation failed: ${error}`,
      });
    }

    const sub = SUBJECTS_CATALOG.find((s) => s.id === entry.subjectId);
    runningUnits += sub?.units || 0;
    validatedSections.push({ subjectId: entry.subjectId, sectionId: entry.sectionId });
  }

  // Atomically increment enrolledCount on each section in the DB
  for (const entry of validatedSections) {
    const subject = SUBJECTS_CATALOG.find((s) => s.id === entry.subjectId);
    const staticSec = (subject?.sections || []).find((s) => s.id === entry.sectionId || s.code === entry.sectionId);

    if (staticSec) {
      await Section.findOneAndUpdate(
        { subjectId: entry.subjectId, sectionCode: staticSec.code },
        { $inc: { enrolledCount: 1 } },
        { upsert: false }
      );
    } else if (mongoose.isValidObjectId(entry.sectionId)) {
      await Section.findByIdAndUpdate(
        entry.sectionId,
        { $inc: { enrolledCount: 1 } },
        { upsert: false }
      );
    }
  }

  // Mark schedule as finalized on the student record
  student.scheduleGenerated = true;
  student.scheduleStatus = 'finalized';
  await student.save();

  res.json({
    success: true,
    message: 'Schedule finalized successfully.',
    data: { selectedSubjects: student.selectedSubjects, totalUnits: runningUnits },
  });
});
