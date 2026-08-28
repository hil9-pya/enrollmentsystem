import asyncHandler from 'express-async-handler';
import Section from './models/Section.js';
import Subject from './models/Subject.js';
import CourseOffering from './models/CourseOffering.js';
import User from './User.js';
import Student from './Student.js';
import {
  SUBJECTS_CATALOG,
  addSubjectToCache,
  updateSubjectInCache,
} from './subjectsCatalog.js';
import { validateSectionConflict } from './services/schedulerService.js';

const SECTION_CODE_PATTERN = /^(CS|BA|NU|GE)-([1-4])([12])([MAE])([1-9])$/;
const PROGRAM_CODE_BY_ID = { bscs: 'CS', bsba: 'BA', bsn: 'NU', elective: 'GE' };
const SUBJECT_CODE_PATTERN = /^(CS|BA|NU|GE) \d{3}$/;
const YEAR_ORDINALS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };
const ALLOWED_PROGRAMS = new Set(Object.keys(PROGRAM_CODE_BY_ID));

export function validateSectionCode(sectionCode, subject) {
  const match = sectionCode.match(SECTION_CODE_PATTERN);
  if (!match) {
    return 'Section code must use CS-11M1 format: program, year 1-4, semester 1-2, M/A/E, section 1-9.';
  }

  const expectedProgram = PROGRAM_CODE_BY_ID[subject.programId];
  if (match[1] !== expectedProgram) {
    return `Section code must use ${expectedProgram} for this subject.`;
  }
  if (subject.yearLevel != null && Number(match[2]) !== Number(subject.yearLevel)) {
    return `Selected subject is for ${YEAR_ORDINALS[subject.yearLevel]} year only.`;
  }
  if (subject.semester != null && Number(match[3]) !== Number(subject.semester)) {
    return `Selected subject is for semester ${subject.semester} only.`;
  }
  return null;
}

function normalizeSubjectInput(input) {
  const programId = String(input.programId || '').trim().toLowerCase();
  return {
    id: String(input.id || '').trim().toLowerCase(),
    code: String(input.code || '').trim().toUpperCase(),
    name: String(input.name || '').trim(),
    units: Number(input.units),
    programId,
    fee: Number(input.fee),
    yearLevel: programId === 'elective' ? null : Number(input.yearLevel),
    semester: programId === 'elective' ? null : Number(input.semester),
    prerequisites: [...new Set((Array.isArray(input.prerequisites) ? input.prerequisites : [])
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean))],
    ...(input.isActive !== undefined ? { isActive: Boolean(input.isActive) } : {}),
  };
}

async function validateSubjectInput(input, currentId = null) {
  if (!/^[a-z0-9-]+$/.test(input.id) || !input.code || !input.name) {
    return 'Subject ID, code, and name are required. ID may contain letters, numbers, and hyphens.';
  }
  if (!SUBJECT_CODE_PATTERN.test(input.code)) return 'Subject code must use a format like CS 401.';
  const expectedCode = PROGRAM_CODE_BY_ID[input.programId];
  if (expectedCode && !input.code.startsWith(`${expectedCode} `)) return `Subject code must start with ${expectedCode} for this program.`;
  if (!ALLOWED_PROGRAMS.has(input.programId)) return 'Select a valid degree program.';
  if (!Number.isInteger(input.units) || input.units < 1 || input.units > 30) return 'Units must be between 1 and 30.';
  if (!Number.isFinite(input.fee) || input.fee < 0) return 'Subject fee cannot be negative.';
  if (input.programId !== 'elective') {
    if (![1, 2, 3, 4].includes(input.yearLevel)) return 'Year level must be from 1 to 4.';
    if (![1, 2].includes(input.semester)) return 'Semester must be 1 or 2.';
  }
  if (input.prerequisites.includes(input.id)) return 'A subject cannot be its own prerequisite.';

  const duplicate = await Subject.findOne({
    id: { $ne: currentId },
    $or: [
      { id: input.id },
      { code: { $regex: `^${input.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    ],
  });
  if (duplicate) return 'Subject ID or code already exists.';

  if (input.prerequisites.length > 0) {
    const prerequisiteCount = await Subject.countDocuments({ id: { $in: input.prerequisites }, isActive: { $ne: false } });
    if (prerequisiteCount !== input.prerequisites.length) return 'One or more prerequisites are missing or inactive.';

    const subjects = await Subject.find({}).select('id prerequisites').lean();
    const prerequisiteMap = new Map(subjects.map((subject) => [subject.id, subject.prerequisites || []]));
    prerequisiteMap.set(input.id, input.prerequisites);
    const reachesSubject = (subjectId, visited = new Set()) => {
      if (subjectId === input.id) return true;
      if (visited.has(subjectId)) return false;
      visited.add(subjectId);
      return (prerequisiteMap.get(subjectId) || []).some((prerequisiteId) => reachesSubject(prerequisiteId, visited));
    };
    if (input.prerequisites.some((prerequisiteId) => reachesSubject(prerequisiteId))) {
      return 'Prerequisites cannot contain a circular dependency.';
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/admin/scheduler/sections
// List all sections (with optional ?subjectId filter)
// ---------------------------------------------------------------------------
export const listSections = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;

  const sections = await Section.find(filter)
    .populate('instructorUser', 'username firstName lastName email')
    .sort({ subjectId: 1, sectionCode: 1 })
    .lean();

  // Enrich with subject info from static catalog
  const enriched = sections.map((sec) => {
    const subject = SUBJECTS_CATALOG.find((s) => s.id === sec.subjectId);
    return {
      ...sec,
      subjectCode: subject?.code || sec.subjectId,
      subjectName: subject?.name || '',
      units: subject?.units || 0,
      availableSlots: Math.max(0, sec.maxSlots - sec.enrolledCount),
    };
  });

  res.json({ success: true, data: enriched });
});

// ---------------------------------------------------------------------------
// POST /api/admin/scheduler/sections
// Create a new section with room/instructor conflict validation
// ---------------------------------------------------------------------------
export const createSection = asyncHandler(async (req, res) => {
  const { subjectId, sectionCode, days, time, room, instructor, instructorUser, maxSlots } = req.body;

  if (!subjectId || !sectionCode || !days || !time) {
    return res.status(400).json({
      success: false,
      message: 'subjectId, sectionCode, days, and time are required.',
    });
  }

  // Check subject exists
  const subject = SUBJECTS_CATALOG.find((s) => s.id === subjectId && s.isActive !== false);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found in catalog.' });
  }

  const normalizedSectionCode = String(sectionCode).trim().toUpperCase();
  const sectionCodeError = validateSectionCode(normalizedSectionCode, subject);
  if (sectionCodeError) {
    return res.status(400).json({ success: false, message: sectionCodeError });
  }

  let assignedInstructor = null;
  if (instructorUser) {
    assignedInstructor = await User.findOne({ _id: instructorUser, role: 'instructor' });
    if (!assignedInstructor) {
      return res.status(400).json({ success: false, message: 'Assigned user must be an instructor account.' });
    }
  } else if (String(instructor || '').trim()) {
    return res.status(400).json({
      success: false,
      message: 'Select an instructor account instead of entering an instructor name.',
    });
  }

  const instructorName = assignedInstructor
    ? `${assignedInstructor.firstName || ''} ${assignedInstructor.lastName || ''}`.trim()
    : '';

  // Check for room/instructor conflicts
  const { valid, error } = await validateSectionConflict({ subjectId, sectionCode: normalizedSectionCode, days, time, room, instructor: instructorName });
  if (!valid) {
    return res.status(409).json({ success: false, message: error });
  }

  // Check duplicate sectionCode for same subject
  const existing = await Section.findOne({ subjectId, sectionCode: normalizedSectionCode });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: `Section ${normalizedSectionCode} already exists for this subject.`,
    });
  }

  const section = await Section.create({
    subjectId,
    sectionCode: normalizedSectionCode,
    days,
    time,
    room: room || '',
    instructor: instructorName,
    instructorUser: assignedInstructor?._id || null,
    maxSlots: maxSlots || 40,
    enrolledCount: 0,
  });

  res.status(201).json({ success: true, message: 'Section created.', data: section });
});

// ---------------------------------------------------------------------------
// PUT /api/admin/scheduler/sections/:id
// Update a section (with re-validation)
// ---------------------------------------------------------------------------
export const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) {
    return res.status(404).json({ success: false, message: 'Section not found.' });
  }

  const { days, time, room, instructor, instructorUser, maxSlots, isActive } = req.body;

  let assignedInstructor;
  if (instructorUser !== undefined) {
    assignedInstructor = instructorUser
      ? await User.findOne({ _id: instructorUser, role: 'instructor' })
      : null;
    if (instructorUser && !assignedInstructor) {
      return res.status(400).json({ success: false, message: 'Assigned user must be an instructor account.' });
    }
    if (!instructorUser && String(instructor || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Select an instructor account instead of entering an instructor name.',
      });
    }
  }

  const instructorName = instructorUser !== undefined
    ? assignedInstructor
      ? `${assignedInstructor.firstName || ''} ${assignedInstructor.lastName || ''}`.trim()
      : ''
    : String(section.instructor || '').trim();

  // Validate room/instructor conflicts (exclude self)
  const sectionData = {
    subjectId: section.subjectId,
    sectionCode: section.sectionCode,
    days: days ?? section.days,
    time: time ?? section.time,
    room: room ?? section.room,
    instructor: instructorName,
  };

  const { valid, error } = await validateSectionConflict(sectionData, req.params.id);
  if (!valid) {
    return res.status(409).json({ success: false, message: error });
  }

  if (days !== undefined) section.days = days;
  if (time !== undefined) section.time = time;
  if (room !== undefined) section.room = room;
  section.instructor = instructorName;
  if (instructorUser !== undefined) {
    section.instructorUser = assignedInstructor?._id || null;
    if (assignedInstructor && instructor === undefined) {
      section.instructor = `${assignedInstructor.firstName} ${assignedInstructor.lastName}`;
    }
  }
  if (maxSlots !== undefined) section.maxSlots = maxSlots;
  if (isActive !== undefined) section.isActive = isActive;

  await section.save();

  let updatedOfferings = 0;
  if (instructorUser !== undefined) {
    const result = await CourseOffering.updateMany(
      { section: section._id, status: { $ne: 'archived' } },
      {
        $set: {
          instructor: assignedInstructor?._id || null,
          instructorName: instructorName || 'TBA',
        },
      }
    );
    updatedOfferings = result.modifiedCount || 0;
  }

  res.json({
    success: true,
    message: updatedOfferings > 0
      ? `Section updated. ${updatedOfferings} official offering${updatedOfferings === 1 ? '' : 's'} synchronized.`
      : 'Section updated.',
    data: section,
    updatedOfferings,
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/scheduler/sections/:id
// Remove a section from the DB
// ---------------------------------------------------------------------------
export const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);
  if (!section) {
    return res.status(404).json({ success: false, message: 'Section not found.' });
  }

  const activeOfferingCount = await CourseOffering.countDocuments({
    section: section._id,
    status: { $ne: 'archived' },
  });
  if (section.enrolledCount > 0 || activeOfferingCount > 0) {
    return res.status(409).json({
      success: false,
      message: 'Cannot delete a section with enrolled students or an active official offering.',
    });
  }

  await section.deleteOne();
  res.json({ success: true, message: 'Section deleted.' });
});

// ---------------------------------------------------------------------------
// GET /api/admin/scheduler/subjects
// Return full catalog list with live section counts, for admin management UI
// ---------------------------------------------------------------------------
export const listSubjectsForAdmin = asyncHandler(async (req, res) => {
  const sections = await Section.find({}).lean();
  const storedSubjects = await Subject.find({}).lean();
  // DB is source of truth so admin catalog updates appear without a server restart.
  const catalog = storedSubjects.length > 0 ? storedSubjects : SUBJECTS_CATALOG;
  const sectionsBySubject = new Map();
  for (const sec of sections) {
    if (!sectionsBySubject.has(sec.subjectId)) sectionsBySubject.set(sec.subjectId, []);
    sectionsBySubject.get(sec.subjectId).push(sec);
  }

  const result = catalog.map((sub) => ({
    ...sub,
    liveSections: sectionsBySubject.get(sub.id) || [],
  }));

  res.json({ success: true, data: result });
});

// ---------------------------------------------------------------------------
// POST /api/scheduler/admin/catalog/subjects
// Add a new subject to the database and in-memory cache
// ---------------------------------------------------------------------------
export const createSubject = asyncHandler(async (req, res) => {
  const subjectInput = normalizeSubjectInput(req.body);
  const validationError = await validateSubjectInput(subjectInput);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const newSubject = new Subject(subjectInput);

  await newSubject.save();
  
  // Add to in-memory cache so computeTuition and other synchronous checks see it immediately
  addSubjectToCache(newSubject.toObject());

  res.status(201).json({ success: true, data: newSubject });
});

export const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({ id: req.params.id });
  if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

  const subjectInput = normalizeSubjectInput({ ...req.body, id: subject.id });
  const validationError = await validateSubjectInput(subjectInput, subject.id);
  if (validationError) return res.status(400).json({ success: false, message: validationError });

  const classificationChanged = subject.programId !== subjectInput.programId
    || Number(subject.yearLevel) !== Number(subjectInput.yearLevel)
    || Number(subject.semester) !== Number(subjectInput.semester);
  if (classificationChanged && await Section.exists({ subjectId: subject.id })) {
    return res.status(409).json({
      success: false,
      message: 'Program, year, or semester cannot change while subject sections exist.',
    });
  }

  Object.assign(subject, subjectInput);
  await subject.save();
  updateSubjectInCache(subject.id, subject.toObject());
  res.json({ success: true, message: 'Subject updated.', data: subject });
});

export const archiveSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({ id: req.params.id });
  if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

  const enrolledSections = await Section.countDocuments({ subjectId: subject.id, enrolledCount: { $gt: 0 } });
  if (enrolledSections > 0) {
    return res.status(409).json({
      success: false,
      message: 'Cannot archive subject while its sections contain enrolled students.',
    });
  }
  const activeStudyPlans = await Student.countDocuments({
    approvedSubjectIds: subject.id,
    status: { $in: ['advising_approved', 'payment_pending', 'payment_confirmed', 'validation_pending'] },
    isDeleted: { $ne: true },
  });
  if (activeStudyPlans > 0) {
    return res.status(409).json({
      success: false,
      message: 'Cannot archive subject while it belongs to an active student study plan.',
    });
  }

  const dependentSubject = await Subject.findOne({ prerequisites: subject.id, isActive: { $ne: false } });
  if (dependentSubject) {
    return res.status(409).json({
      success: false,
      message: `Cannot archive ${subject.code}; ${dependentSubject.code} uses it as a prerequisite.`,
    });
  }

  subject.isActive = false;
  await subject.save();
  await Section.updateMany({ subjectId: subject.id }, { $set: { isActive: false } });
  updateSubjectInCache(subject.id, subject.toObject());
  res.json({ success: true, message: 'Subject archived.', data: subject });
});
