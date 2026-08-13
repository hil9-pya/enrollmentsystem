import asyncHandler from 'express-async-handler';
import { resolveStudentProfileForUser } from './services/studentIdentityService.js';
import AcademicTerm from './models/AcademicTerm.js';
import CourseOffering from './models/CourseOffering.js';
import CourseMembership from './models/CourseMembership.js';
import Student from './Student.js';
import User from './User.js';
import Settings from './Settings.js';
import AcademicAuditLog from './models/AcademicAuditLog.js';
import Section from './models/Section.js';
import { ensureAcademicTerm } from './services/academicFoundationService.js';
import { parseAcademicTermLabel } from './academicTermUtils.js';

const TERM_DATE_FIELDS = [
  'enrollmentStartsAt',
  'enrollmentEndsAt',
  'classesStartAt',
  'classesEndAt',
  'lmsOpensAt',
  'lmsClosesAt',
];

async function recordAcademicAction(req, action, entityType, entityId, metadata = {}) {
  await AcademicAuditLog.create({
    actor: req.user?._id || null,
    actorRole: req.user?.role || 'system',
    action,
    entityType,
    entityId: String(entityId),
    metadata,
  });
}

export const listAcademicTerms = asyncHandler(async (_req, res) => {
  const terms = await AcademicTerm.find({}).sort({ isActive: -1, createdAt: -1 });
  res.json({ success: true, data: terms });
});

export const createAcademicTerm = asyncHandler(async (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({ success: false, message: 'Term name is required.' });
  }

  let metadata;
  try {
    metadata = parseAcademicTermLabel(req.body.name);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  const term = await ensureAcademicTerm(metadata.name, { activate: false });
  for (const field of TERM_DATE_FIELDS) {
    if (req.body[field] !== undefined) term[field] = req.body[field] || null;
  }
  term.schoolYear = metadata.schoolYear;
  term.semester = metadata.semester;
  await term.save();
  res.status(201).json({ success: true, data: term });
});

export const updateAcademicTerm = asyncHandler(async (req, res) => {
  const term = await AcademicTerm.findById(req.params.id);
  if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

  if (req.body.status === 'active') {
    return res.status(400).json({ success: false, message: 'Use the activate-term action to make a term active.' });
  }
  if (req.body.name !== undefined) {
    let metadata;
    try {
      metadata = parseAcademicTermLabel(req.body.name);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    term.name = metadata.name;
    term.code = metadata.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    term.schoolYear = metadata.schoolYear;
    term.semester = metadata.semester;
  }
  for (const field of [...TERM_DATE_FIELDS, 'status']) {
    if (req.body[field] !== undefined) term[field] = req.body[field];
  }
  if (['closed', 'archived'].includes(req.body.status)) term.isActive = false;
  await term.save();
  if (req.body.status === 'archived') {
    await CourseOffering.updateMany({ term: term._id }, { $set: { status: 'archived' } });
  } else if (req.body.status === 'closed') {
    await CourseOffering.updateMany(
      { term: term._id, status: { $ne: 'archived' } },
      { $set: { status: 'closed' } }
    );
  }
  res.json({ success: true, data: term });
});

export const activateAcademicTerm = asyncHandler(async (req, res) => {
  const existing = await AcademicTerm.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Academic term not found.' });

  const term = await ensureAcademicTerm(existing.name, { activate: true });
  await Settings.findOneAndUpdate(
    {},
    { $set: { activeTerm: term.name } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, data: term });
});

export const listCourseOfferings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.termId) filter.term = req.query.termId;
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role === 'instructor') filter.instructor = req.user._id;

  const offerings = await CourseOffering.find(filter)
    .populate('term', 'code name schoolYear semester status isActive')
    .populate('instructor', 'username firstName lastName email role')
    .sort({ subjectCode: 1, sectionCode: 1 });
  res.json({ success: true, data: offerings });
});

export const getMyClasses = asyncHandler(async (req, res) => {
  if (req.user.role === 'student') {
    const student = await resolveStudentProfileForUser(req.user);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const memberships = await CourseMembership.find({ student: student._id, status: 'enrolled' })
      .populate({
        path: 'offering',
        populate: [
          { path: 'term', select: 'code name schoolYear semester status isActive' },
          { path: 'instructor', select: 'username firstName lastName email' },
        ],
      })
      .sort({ createdAt: 1 });
    const visibleMemberships = memberships.map((membership) => {
      const item = membership.toObject();
      if (item.gradeStatus !== 'published') item.finalGrade = null;
      return item;
    });
    return res.json({ success: true, data: visibleMemberships });
  }

  const filter = req.user.role === 'instructor' ? { instructor: req.user._id } : {};
  if (req.user.role === 'instructor') {
    const activeTermIds = await AcademicTerm.find({ isActive: true }).distinct('_id');
    filter.term = { $in: activeTermIds };
  }
  const offerings = await CourseOffering.find(filter)
    .populate('term', 'code name schoolYear semester status isActive')
    .populate('instructor', 'username firstName lastName email')
    .sort({ subjectCode: 1, sectionCode: 1 });
  return res.json({ success: true, data: offerings });
});

export const getOfferingRoster = asyncHandler(async (req, res) => {
  const offering = await CourseOffering.findById(req.params.id);
  if (!offering) return res.status(404).json({ success: false, message: 'Course offering not found.' });
  if (req.user.role === 'instructor' && String(offering.instructor) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }

  const memberships = await CourseMembership.find({
    offering: offering._id,
    status: { $in: ['enrolled', 'completed'] },
  })
    .populate('student', 'studentId firstName lastName email programId yearLevel')
    .sort({ createdAt: 1 });
  res.json({ success: true, data: memberships });
});

export const assignOfferingInstructor = asyncHandler(async (req, res) => {
  const offering = await CourseOffering.findById(req.params.id);
  if (!offering) return res.status(404).json({ success: false, message: 'Course offering not found.' });

  const instructor = await User.findOne({ _id: req.body.instructorId, role: 'instructor' });
  if (!instructor) {
    return res.status(400).json({ success: false, message: 'Selected user is not an instructor.' });
  }

  offering.instructor = instructor._id;
  offering.instructorName = `${instructor.firstName} ${instructor.lastName}`;
  await offering.save();
  await recordAcademicAction(req, 'assigned_instructor', 'course_offering', offering._id, {
    instructorId: String(instructor._id),
  });
  res.json({ success: true, data: offering });
});

export const submitFinalGrade = asyncHandler(async (req, res) => {
  const membership = await CourseMembership.findById(req.params.id).populate('offering');
  if (!membership) return res.status(404).json({ success: false, message: 'Course membership not found.' });
  if (membership.status !== 'enrolled') {
    return res.status(409).json({ success: false, message: 'Only enrolled students can receive a final grade.' });
  }
  if (
    req.user.role === 'instructor'
    && String(membership.offering?.instructor) !== String(req.user._id)
  ) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }

  const grade = Number(req.body.grade);
  if (!Number.isFinite(grade) || grade < 1 || grade > 5) {
    return res.status(400).json({ success: false, message: 'Final grade must be between 1.00 and 5.00.' });
  }

  membership.finalGrade = grade;
  membership.gradeStatus = 'submitted';
  membership.gradeSubmittedAt = new Date();
  membership.gradeReviewedAt = null;
  membership.gradePublishedAt = null;
  membership.gradeReviewNotes = '';
  await membership.save();
  await recordAcademicAction(req, 'submitted_final_grade', 'course_membership', membership._id, { grade });
  res.json({ success: true, data: membership });
});

export const listSubmittedGrades = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.gradeStatus = req.query.status;
  else filter.gradeStatus = { $in: ['submitted', 'returned', 'approved'] };

  const memberships = await CourseMembership.find(filter)
    .populate('student', 'studentId firstName lastName programId yearLevel')
    .populate({
      path: 'offering',
      populate: [
        { path: 'term', select: 'code name schoolYear semester status' },
        { path: 'instructor', select: 'username firstName lastName email' },
      ],
    })
    .sort({ gradeSubmittedAt: 1 });
  res.json({ success: true, data: memberships });
});

export const reviewFinalGrade = asyncHandler(async (req, res) => {
  const membership = await CourseMembership.findById(req.params.id);
  if (!membership) return res.status(404).json({ success: false, message: 'Course membership not found.' });
  if (membership.gradeStatus !== 'submitted') {
    return res.status(409).json({ success: false, message: 'Only submitted grades can be reviewed.' });
  }

  const action = req.body.action;
  if (!['approve', 'return'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be approve or return.' });
  }
  if (action === 'return' && !String(req.body.notes || '').trim()) {
    return res.status(400).json({ success: false, message: 'Review notes are required when returning a grade.' });
  }

  membership.gradeStatus = action === 'approve' ? 'approved' : 'returned';
  membership.gradeReviewedAt = new Date();
  membership.gradeReviewNotes = String(req.body.notes || '').trim();
  await membership.save();
  await recordAcademicAction(
    req,
    action === 'approve' ? 'approved_final_grade' : 'returned_final_grade',
    'course_membership',
    membership._id,
    {
    notes: membership.gradeReviewNotes,
    }
  );
  res.json({ success: true, data: membership });
});

export const publishFinalGrade = asyncHandler(async (req, res) => {
  const membership = await CourseMembership.findById(req.params.id)
    .populate('offering')
    .populate('term');
  if (!membership) return res.status(404).json({ success: false, message: 'Course membership not found.' });
  if (membership.gradeStatus !== 'approved') {
    return res.status(409).json({ success: false, message: 'Registrar approval is required before publication.' });
  }

  const student = await Student.findById(membership.student);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });
  const record = {
    subjectId: membership.offering.subjectId,
    grade: membership.finalGrade,
    term: membership.term.name,
  };
  const recordIndex = student.academicRecord.findIndex(
    (item) => item.subjectId === record.subjectId && item.term === record.term
  );
  if (recordIndex >= 0) student.academicRecord[recordIndex].set(record);
  else student.academicRecord.push(record);
  await student.save();

  membership.gradeStatus = 'published';
  membership.gradePublishedAt = new Date();
  membership.status = 'completed';
  membership.endedAt = new Date();
  await membership.save();
  await recordAcademicAction(req, 'published_final_grade', 'course_membership', membership._id, {
    grade: membership.finalGrade,
    studentId: student.studentId,
  });
  res.json({ success: true, data: membership });
});

export const updateMembershipStatus = asyncHandler(async (req, res) => {
  const nextStatus = String(req.body.status || '').trim().toLowerCase();
  if (!['enrolled', 'dropped', 'withdrawn'].includes(nextStatus)) {
    return res.status(400).json({ success: false, message: 'Status must be enrolled, dropped, or withdrawn.' });
  }

  const membership = await CourseMembership.findById(req.params.id)
    .populate('offering')
    .populate('term');
  if (!membership) return res.status(404).json({ success: false, message: 'Course membership not found.' });
  if (membership.status === 'completed') {
    return res.status(409).json({ success: false, message: 'Completed memberships cannot be reopened.' });
  }
  if (membership.status === nextStatus) return res.json({ success: true, data: membership });
  const previousStatus = membership.status;

  const studentMarker = String(membership.student);
  const sectionId = membership.offering?.section;
  if (nextStatus === 'enrolled') {
    if (membership.term?.status !== 'active' || membership.offering?.status !== 'active') {
      return res.status(409).json({ success: false, message: 'Only active-term class memberships can be reinstated.' });
    }
    if (sectionId) {
      const alreadyReserved = await Section.exists({ _id: sectionId, enrolledStudentIds: studentMarker });
      if (!alreadyReserved) {
        const reserved = await Section.findOneAndUpdate(
          {
            _id: sectionId,
            isActive: { $ne: false },
            enrolledStudentIds: { $ne: studentMarker },
            $expr: { $lt: ['$enrolledCount', '$maxSlots'] },
          },
          { $addToSet: { enrolledStudentIds: studentMarker }, $inc: { enrolledCount: 1 } },
          { new: true }
        );
        if (!reserved) return res.status(409).json({ success: false, message: 'Class section is full or unavailable.' });
      }
    }
    membership.status = 'enrolled';
    membership.endedAt = null;
  } else {
    if (sectionId) {
      await Section.updateOne(
        { _id: sectionId, enrolledStudentIds: studentMarker },
        { $pull: { enrolledStudentIds: studentMarker }, $inc: { enrolledCount: -1 } }
      );
    }
    membership.status = nextStatus;
    membership.endedAt = new Date();
  }

  await membership.save();
  await recordAcademicAction(req, `membership_${nextStatus}`, 'course_membership', membership._id, {
    previousStatus,
    notes: String(req.body.notes || '').trim(),
  });
  res.json({ success: true, data: membership });
});
