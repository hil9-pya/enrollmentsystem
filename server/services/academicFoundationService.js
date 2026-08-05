import AcademicTerm from '../models/AcademicTerm.js';
import CourseOffering from '../models/CourseOffering.js';
import CourseMembership from '../models/CourseMembership.js';
import User from '../User.js';
import AcademicAuditLog from '../models/AcademicAuditLog.js';
import { getResolvedEnrolledSchedule } from './schedulerService.js';

function normalizeTermCode(label) {
  const normalized = String(label || 'Current Term')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || `TERM-${new Date().getFullYear()}`;
}

function termMetadata(label) {
  const value = String(label || 'Current Term').trim();
  const schoolYear = value.match(/\b(20\d{2}\s*[-/]\s*20\d{2})\b/)?.[1]?.replace(/\s+/g, '') || '';
  const lower = value.toLowerCase();
  const semester = lower.includes('summer')
    ? 'summer'
    : lower.includes('2nd') || lower.includes('second') || lower.includes('spring')
      ? '2'
      : lower.includes('1st') || lower.includes('first') || lower.includes('fall')
        ? '1'
        : 'other';
  return { schoolYear, semester };
}

export async function ensureAcademicTerm(label, { activate = false } = {}) {
  const name = String(label || 'Current Term').trim();
  const code = normalizeTermCode(name);
  const metadata = termMetadata(name);

  let term = await AcademicTerm.findOneAndUpdate(
    { code },
    {
      $setOnInsert: {
        code,
        name,
        ...metadata,
        status: activate ? 'active' : 'planned',
        isActive: activate,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (activate) {
    const previousActiveTerms = await AcademicTerm.find({
      _id: { $ne: term._id },
      isActive: true,
    }).select('_id');
    await AcademicTerm.updateMany(
      { _id: { $ne: term._id }, isActive: true },
      { $set: { isActive: false, status: 'closed' } }
    );
    if (previousActiveTerms.length > 0) {
      await CourseOffering.updateMany(
        {
          term: { $in: previousActiveTerms.map((item) => item._id) },
          status: { $nin: ['closed', 'archived'] },
        },
        { $set: { status: 'closed' } }
      );
    }
    if (!term.isActive || term.status !== 'active') {
      term.isActive = true;
      term.status = 'active';
      await term.save();
    }
    await CourseOffering.updateMany(
      { term: term._id, status: 'closed' },
      { $set: { status: 'active' } }
    );
  }

  return term;
}

async function findInstructorUser(instructorName, instructorId) {
  if (instructorId) {
    const assigned = await User.findOne({ _id: instructorId, role: 'instructor' }).select('_id');
    if (assigned) return assigned._id;
  }

  const normalizedName = String(instructorName || '')
    .replace(/^(prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '')
    .trim()
    .toLowerCase();
  if (!normalizedName || normalizedName === 'tba') return null;

  const instructors = await User.find({ role: 'instructor' }).select('firstName lastName').lean();
  const match = instructors.find((user) =>
    `${user.firstName} ${user.lastName}`.trim().toLowerCase() === normalizedName
  );
  return match?._id || null;
}

export async function syncOfficialEnrollment(
  student,
  activeTermLabel,
  { actor = null, activateTerm = true, audit = true } = {}
) {
  const selectedSubjects = student.selectedSubjects || [];
  if (selectedSubjects.length === 0) {
    throw new Error('Cannot create official class memberships without selected subjects.');
  }

  const scheduleRows = await getResolvedEnrolledSchedule(selectedSubjects);
  if (scheduleRows.length !== selectedSubjects.length) {
    throw new Error('One or more saved class sections no longer exist. Resolve the schedule before final enrollment.');
  }

  const term = await ensureAcademicTerm(
    activeTermLabel || student.academicTerm || 'Current Term',
    { activate: activateTerm }
  );
  const studentUser = await User.findOne({
    role: 'student',
    username: student.studentId,
  }).select('_id');

  const offeringIds = [];
  for (const row of scheduleRows) {
    const instructor = await findInstructorUser(row.instructor, row.instructorUserId);
    const offering = await CourseOffering.findOneAndUpdate(
      {
        term: term._id,
        subjectId: row.subjectId,
        sectionKey: String(row.sectionId),
      },
      {
        $set: {
          subjectCode: row.subjectCode,
          subjectName: row.subjectName,
          units: Number(row.units) || 0,
          sectionCode: row.sectionCode,
          section: row.sectionDatabaseId || null,
          schedule: row.schedule,
          instructorName: row.instructor || 'TBA',
          instructor,
          capacity: Number(row.maxSlots) || 40,
          status: 'active',
        },
        $setOnInsert: { lmsEnabled: false },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    offeringIds.push(offering._id);

    await CourseMembership.findOneAndUpdate(
      { student: student._id, offering: offering._id },
      {
        $set: {
          studentUser: studentUser?._id || null,
          term: term._id,
          status: 'enrolled',
          source: 'registrar',
          enrolledAt: student.enrolledAt || new Date(),
          endedAt: null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  await CourseMembership.updateMany(
    {
      student: student._id,
      term: term._id,
      status: 'enrolled',
      offering: { $nin: offeringIds },
    },
    { $set: { status: 'dropped', endedAt: new Date() } }
  );

  if (audit) {
    await AcademicAuditLog.create({
      actor: actor?._id || null,
      actorRole: actor?.role || 'system',
      action: 'synchronized_official_enrollment',
      entityType: 'student',
      entityId: String(student._id),
      metadata: {
        studentId: student.studentId,
        termId: String(term._id),
        offeringIds: offeringIds.map(String),
      },
    });
  }

  return { term, offeringIds, scheduleRows };
}

export async function backfillOfficialEnrollments() {
  const { default: Student } = await import('../Student.js');
  const students = await Student.find({
    status: 'enrolled',
    studentId: { $ne: null },
    'selectedSubjects.0': { $exists: true },
    isDeleted: { $ne: true },
  });

  const summary = { processed: 0, failed: [] };
  for (const student of students) {
    try {
      await syncOfficialEnrollment(student, student.academicTerm || student.lastEnrolledTerm, {
        activateTerm: false,
        audit: false,
      });
      summary.processed += 1;
    } catch (error) {
      summary.failed.push({ studentId: student.studentId || student._id, message: error.message });
    }
  }
  return summary;
}
