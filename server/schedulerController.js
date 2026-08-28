import asyncHandler from 'express-async-handler';
import Student from './Student.js';
import Section from './models/Section.js';
import { computeTuition, SUBJECTS_CATALOG } from './subjectsCatalog.js';
import {
  enrichSubjectWithLiveSections,
  getStudyPlanSubjectsForStudent,
  getPassedSubjectIds,
  getResolvedEnrolledSchedule,
  validateAddSection,
  validateStudentSubjectEligibility,
} from './services/schedulerService.js';
import { getOfficialEnrollmentSchedule } from './services/officialScheduleService.js';

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

  const passedSubjectIds = getPassedSubjectIds(student.academicRecord);
  const curriculumSubjects = getStudyPlanSubjectsForStudent(student);

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

  let schedule = [];
  if (student.status === 'enrolled') {
    schedule = await getOfficialEnrollmentSchedule(student);
  }
  if (schedule.length === 0) {
    schedule = await getResolvedEnrolledSchedule(student.selectedSubjects || []);
  }
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
  const eligibility = validateStudentSubjectEligibility(student, subjectId);
  if (!eligibility.valid) {
    return res.status(403).json({ success: false, message: eligibility.error });
  }

  const enriched = await enrichSubjectWithLiveSections(eligibility.subject);
  res.json({ success: true, data: enriched.sections || [] });
});

// ---------------------------------------------------------------------------
// POST /api/scheduler/:studentId/add
// Validate and add a section to the student's selected subjects.
// ---------------------------------------------------------------------------
export const addSchedulerSection = asyncHandler(async (req, res) => {
  const student = await getStudent(req, res);
  if (!student) return;

  if (student.status !== 'advising_approved') {
    return res.status(409).json({ success: false, message: 'Subject enrollment is not open for this student.' });
  }

  if (student.scheduleStatus === 'finalized' || student.scheduleGenerated) {
    return res.status(409).json({ success: false, message: 'Finalized schedules are locked. Contact your adviser for changes.' });
  }

  const { subjectId, sectionId } = req.body;
  if (!subjectId || !sectionId) {
    return res.status(400).json({ success: false, message: 'subjectId and sectionId are required.' });
  }

  const eligibility = validateStudentSubjectEligibility(student, subjectId);
  if (!eligibility.valid) {
    return res.status(403).json({ success: false, message: eligibility.error });
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
  const selectedSubjects = (student.selectedSubjects || []).filter(
    (s) => s.subjectId !== subjectId
  );
  selectedSubjects.push({ subjectId, sectionId, addedAt: new Date() });

  const subjectIds = selectedSubjects.map((entry) => entry.subjectId);
  const { tuitionBreakdown, totalTuition } = computeTuition(subjectIds);
  const updated = await Student.findOneAndUpdate(
    {
      _id: student._id,
      scheduleStatus: 'draft',
      scheduleGenerated: { $ne: true },
      __v: student.__v,
    },
    {
      $set: { selectedSubjects, tuitionBreakdown, totalTuition },
      $inc: { __v: 1 },
    },
    { new: true }
  );
  if (!updated) {
    return res.status(409).json({ success: false, message: 'Schedule changed. Refresh and try again.' });
  }

  res.json({
    success: true,
    message: 'Section added successfully.',
    data: {
      selectedSubjects: updated.selectedSubjects,
      tuitionBreakdown: updated.tuitionBreakdown,
      totalTuition: updated.totalTuition,
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

  if (student.status !== 'advising_approved') {
    return res.status(409).json({ success: false, message: 'Subject enrollment is not open for this student.' });
  }

  if (student.scheduleStatus === 'finalized' || student.scheduleGenerated) {
    return res.status(409).json({ success: false, message: 'Finalized schedules are locked. Contact your adviser for changes.' });
  }

  const { subjectId } = req.body;
  if (!subjectId) {
    return res.status(400).json({ success: false, message: 'subjectId is required.' });
  }

  const selectedSubjects = (student.selectedSubjects || []).filter(
    (s) => s.subjectId !== subjectId
  );

  const subjectIds = selectedSubjects.map((entry) => entry.subjectId);
  const { tuitionBreakdown, totalTuition } = computeTuition(subjectIds);
  const updated = await Student.findOneAndUpdate(
    {
      _id: student._id,
      scheduleStatus: 'draft',
      scheduleGenerated: { $ne: true },
      __v: student.__v,
    },
    {
      $set: { selectedSubjects, tuitionBreakdown, totalTuition },
      $inc: { __v: 1 },
    },
    { new: true }
  );
  if (!updated) {
    return res.status(409).json({ success: false, message: 'Schedule changed. Refresh and try again.' });
  }

  res.json({
    success: true,
    message: 'Section removed.',
    data: {
      selectedSubjects: updated.selectedSubjects,
      tuitionBreakdown: updated.tuitionBreakdown,
      totalTuition: updated.totalTuition,
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

  if (student.scheduleStatus === 'finalizing') {
    return res.status(409).json({ success: false, message: 'Schedule finalization is already in progress.' });
  }

  if (student.status !== 'advising_approved') {
    return res.status(409).json({ success: false, message: 'Schedule cannot be finalized before advising approval.' });
  }

  const lockedStudent = await Student.findOneAndUpdate(
    {
      _id: student._id,
      scheduleStatus: 'draft',
      scheduleGenerated: { $ne: true },
    },
    { $set: { scheduleStatus: 'finalizing' }, $inc: { __v: 1 } },
    { new: true }
  );
  if (!lockedStudent) {
    return res.status(409).json({ success: false, message: 'Schedule state changed. Refresh and try again.' });
  }

  const selected = lockedStudent.selectedSubjects || [];
  if (selected.length === 0) {
    await Student.updateOne(
      { _id: lockedStudent._id, scheduleStatus: 'finalizing' },
      { $set: { scheduleStatus: 'draft' }, $inc: { __v: 1 } }
    );
    return res.status(400).json({ success: false, message: 'No subjects selected. Please add at least one subject.' });
  }

  const plannedSubjects = getStudyPlanSubjectsForStudent(lockedStudent);
  const requiredSubjectIds = lockedStudent.enrollmentType === 'new'
    ? plannedSubjects.filter((subject) => subject.programId !== 'elective').map((subject) => subject.id)
    : (lockedStudent.approvedSubjectIds || []);
  const selectedSubjectIds = new Set(selected.map((entry) => entry.subjectId));
  const missingRequiredSubjects = requiredSubjectIds.filter((subjectId) => !selectedSubjectIds.has(subjectId));
  if (missingRequiredSubjects.length > 0) {
    await Student.updateOne(
      { _id: lockedStudent._id, scheduleStatus: 'finalizing' },
      { $set: { scheduleStatus: 'draft' }, $inc: { __v: 1 } }
    );
    const missingCodes = missingRequiredSubjects.map((subjectId) => (
      SUBJECTS_CATALOG.find((subject) => subject.id === subjectId)?.code || subjectId
    ));
    return res.status(409).json({
      success: false,
      message: `Complete your approved study plan before finalizing. Missing: ${missingCodes.join(', ')}.`,
    });
  }

  // Full server-side re-validation from scratch
  let runningUnits = 0;
  const validatedSections = [];

  for (const entry of selected) {
    const eligibility = validateStudentSubjectEligibility(lockedStudent, entry.subjectId);
    if (!eligibility.valid) {
      await Student.updateOne(
        { _id: lockedStudent._id, scheduleStatus: 'finalizing' },
        { $set: { scheduleStatus: 'draft' }, $inc: { __v: 1 } }
      );
      return res.status(409).json({
        success: false,
        message: `Schedule validation failed: ${eligibility.error}`,
      });
    }

    const { valid, error } = await validateAddSection(
      validatedSections,
      entry.subjectId,
      entry.sectionId,
      runningUnits,
      lockedStudent.overloadPermit || false
    );

    if (!valid) {
      await Student.updateOne(
        { _id: lockedStudent._id, scheduleStatus: 'finalizing' },
        { $set: { scheduleStatus: 'draft' }, $inc: { __v: 1 } }
      );
      return res.status(409).json({
        success: false,
        message: `Schedule validation failed: ${error}`,
      });
    }

    const sub = SUBJECTS_CATALOG.find((s) => s.id === entry.subjectId);
    runningUnits += sub?.units || 0;
    validatedSections.push({ subjectId: entry.subjectId, sectionId: entry.sectionId });
  }

  const scheduleRows = await getResolvedEnrolledSchedule(validatedSections);
  const newlyReservedSectionIds = [];
  try {
    for (const row of scheduleRows) {
      if (!row.sectionDatabaseId) {
        throw new Error(`Section ${row.sectionCode} is not backed by an active database schedule.`);
      }

      const alreadyReserved = await Section.exists({
        _id: row.sectionDatabaseId,
        enrolledStudentIds: String(lockedStudent._id),
      });
      if (alreadyReserved) continue;

      const reserved = await Section.findOneAndUpdate(
        {
          _id: row.sectionDatabaseId,
          isActive: { $ne: false },
          enrolledStudentIds: { $ne: String(lockedStudent._id) },
          $expr: { $lt: ['$enrolledCount', '$maxSlots'] },
        },
        {
          $addToSet: { enrolledStudentIds: String(lockedStudent._id) },
          $inc: { enrolledCount: 1 },
        },
        { new: true }
      );
      if (!reserved) throw new Error(`Section ${row.sectionCode} became full or unavailable.`);
      newlyReservedSectionIds.push(row.sectionDatabaseId);
    }

    const finalized = await Student.findOneAndUpdate(
      { _id: lockedStudent._id, scheduleStatus: 'finalizing' },
      { $set: { scheduleGenerated: true, scheduleStatus: 'finalized' }, $inc: { __v: 1 } },
      { new: true }
    );
    if (!finalized) throw new Error('Schedule state changed before finalization completed.');
  } catch (error) {
    if (newlyReservedSectionIds.length > 0) {
      await Section.updateMany(
        { _id: { $in: newlyReservedSectionIds }, enrolledStudentIds: String(lockedStudent._id) },
        {
          $pull: { enrolledStudentIds: String(lockedStudent._id) },
          $inc: { enrolledCount: -1 },
        }
      );
    }
    await Student.updateOne(
      { _id: lockedStudent._id, scheduleStatus: 'finalizing' },
      { $set: { scheduleStatus: 'draft', scheduleGenerated: false }, $inc: { __v: 1 } }
    );
    return res.status(409).json({ success: false, message: error.message });
  }

  res.json({
    success: true,
    message: 'Schedule finalized successfully.',
    data: { selectedSubjects: lockedStudent.selectedSubjects, totalUnits: runningUnits },
  });
});
