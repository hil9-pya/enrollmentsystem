import asyncHandler from 'express-async-handler';
import Section from './models/Section.js';
import Subject from './models/Subject.js';
import { SUBJECTS_CATALOG, addSubjectToCache } from './subjectsCatalog.js';
import { validateSectionConflict } from './services/schedulerService.js';

// ---------------------------------------------------------------------------
// GET /api/admin/scheduler/sections
// List all sections (with optional ?subjectId filter)
// ---------------------------------------------------------------------------
export const listSections = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.subjectId) filter.subjectId = req.query.subjectId;

  const sections = await Section.find(filter).sort({ subjectId: 1, sectionCode: 1 }).lean();

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
  const { subjectId, sectionCode, days, time, room, instructor, maxSlots } = req.body;

  if (!subjectId || !sectionCode || !days || !time) {
    return res.status(400).json({
      success: false,
      message: 'subjectId, sectionCode, days, and time are required.',
    });
  }

  // Check subject exists
  const subject = SUBJECTS_CATALOG.find((s) => s.id === subjectId);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found in catalog.' });
  }

  // Check for room/instructor conflicts
  const { valid, error } = await validateSectionConflict({ subjectId, sectionCode, days, time, room, instructor });
  if (!valid) {
    return res.status(409).json({ success: false, message: error });
  }

  // Check duplicate sectionCode for same subject
  const existing = await Section.findOne({ subjectId, sectionCode });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: `Section ${sectionCode} already exists for this subject.`,
    });
  }

  const section = await Section.create({
    subjectId,
    sectionCode,
    days,
    time,
    room: room || '',
    instructor: instructor || '',
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

  const { days, time, room, instructor, maxSlots, isActive } = req.body;

  // Validate room/instructor conflicts (exclude self)
  const sectionData = {
    subjectId: section.subjectId,
    sectionCode: section.sectionCode,
    days: days ?? section.days,
    time: time ?? section.time,
    room: room ?? section.room,
    instructor: instructor ?? section.instructor,
  };

  const { valid, error } = await validateSectionConflict(sectionData, req.params.id);
  if (!valid) {
    return res.status(409).json({ success: false, message: error });
  }

  if (days !== undefined) section.days = days;
  if (time !== undefined) section.time = time;
  if (room !== undefined) section.room = room;
  if (instructor !== undefined) section.instructor = instructor;
  if (maxSlots !== undefined) section.maxSlots = maxSlots;
  if (isActive !== undefined) section.isActive = isActive;

  await section.save();
  res.json({ success: true, message: 'Section updated.', data: section });
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

  await section.deleteOne();
  res.json({ success: true, message: 'Section deleted.' });
});

// ---------------------------------------------------------------------------
// GET /api/admin/scheduler/subjects
// Return full catalog list with live section counts, for admin management UI
// ---------------------------------------------------------------------------
export const listSubjectsForAdmin = asyncHandler(async (req, res) => {
  const sections = await Section.find({}).lean();
  const sectionsBySubject = new Map();
  for (const sec of sections) {
    if (!sectionsBySubject.has(sec.subjectId)) sectionsBySubject.set(sec.subjectId, []);
    sectionsBySubject.get(sec.subjectId).push(sec);
  }

  const result = SUBJECTS_CATALOG.map((sub) => ({
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
  const { id, code, name, units, programId, fee, yearLevel, semester, prerequisites } = req.body;

  if (!id || !code || !name || !units || !programId || fee === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required subject fields.' });
  }

  const existing = await Subject.findOne({ id });
  if (existing) {
    return res.status(400).json({ success: false, message: `Subject ID '${id}' already exists.` });
  }

  const newSubject = new Subject({
    id,
    code,
    name,
    units,
    programId,
    fee,
    yearLevel,
    semester,
    prerequisites: prerequisites || [],
  });

  await newSubject.save();
  
  // Add to in-memory cache so computeTuition and other synchronous checks see it immediately
  addSubjectToCache(newSubject.toObject());

  res.status(201).json({ success: true, data: newSubject });
});
