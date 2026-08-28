import AcademicTerm from '../models/AcademicTerm.js';
import CourseOffering from '../models/CourseOffering.js';
import CourseMembership from '../models/CourseMembership.js';
import User from '../User.js';
import AcademicAuditLog from '../models/AcademicAuditLog.js';
import { getResolvedEnrolledSchedule } from './schedulerService.js';
import { parseAcademicTermLabel } from '../academicTermUtils.js';

function normalizeTermCode(label) {
  const normalized = String(label || 'Current Term')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || `TERM-${new Date().getFullYear()}`;
}

export async function ensureAcademicTerm(label, { activate = false, session = null } = {}) {
  const metadata = parseAcademicTermLabel(label);
  const name = metadata.name;
  const code = normalizeTermCode(name);

  let term = await AcademicTerm.findOneAndUpdate(
    { code },
    {
      $setOnInsert: {
        code,
        name,
        schoolYear: metadata.schoolYear,
        semester: metadata.semester,
        status: activate ? 'active' : 'planned',
        isActive: activate,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, session }
  );

  if (activate) {
    const previousActiveTerms = await AcademicTerm.find({
      _id: { $ne: term._id },
      isActive: true,
    }).select('_id').session(session);
    await AcademicTerm.updateMany(
      { _id: { $ne: term._id }, isActive: true },
      { $set: { isActive: false, status: 'closed' } },
      { session }
    );
    if (previousActiveTerms.length > 0) {
      await CourseOffering.updateMany(
        {
          term: { $in: previousActiveTerms.map((item) => item._id) },
          status: { $nin: ['closed', 'archived'] },
        },
        { $set: { status: 'closed' } },
        { session }
      );
    }
    if (!term.isActive || term.status !== 'active') {
      term.isActive = true;
      term.status = 'active';
      await term.save({ session });
    }
    await CourseOffering.updateMany(
      { term: term._id, status: 'closed' },
      { $set: { status: 'active' } },
      { session }
    );
  }

  return term;
}

export async function repairLegacyEnrolledStudentTerms(activeTermLabel) {
  const activeTerm = parseAcademicTermLabel(activeTermLabel);
  const { default: Student } = await import('../Student.js');
  const legacyPattern = /^(1st|2nd) Semester$/i;
  const students = await Student.find({
    status: 'enrolled',
    $or: [
      { academicTerm: legacyPattern },
      { lastEnrolledTerm: legacyPattern },
    ],
  }).select('academicTerm lastEnrolledTerm academicRecord');

  if (students.length === 0) return 0;

  const memberships = await CourseMembership.find({
    student: { $in: students.map((student) => student._id) },
  })
    .populate('term', 'name semester schoolYear')
    .sort({ updatedAt: -1 })
    .lean();
  const membershipTermsByStudent = new Map();
  for (const membership of memberships) {
    if (!membership.term?.name) continue;
    const studentId = String(membership.student);
    if (!membershipTermsByStudent.has(studentId)) membershipTermsByStudent.set(studentId, []);
    membershipTermsByStudent.get(studentId).push(membership.term.name);
  }

  const inferFullLabel = (legacyLabel, student) => {
    const match = String(legacyLabel || '').trim().match(legacyPattern);
    if (!match) return null;
    const semester = match[1].toLowerCase() === '1st' ? '1' : '2';
    const evidenceLabels = [
      ...(membershipTermsByStudent.get(String(student._id)) || []),
      ...(student.academicRecord || []).map((record) => record.term),
    ];
    const evidence = evidenceLabels
      .map((label) => {
        try { return parseAcademicTermLabel(label); } catch { return null; }
      })
      .filter((metadata) => metadata?.semester === semester)
      .sort((a, b) => b.startYear - a.startYear);
    if (evidence.length > 0) return evidence[0].name;

    if (semester === activeTerm.semester) return activeTerm.name;
    if (semester === '1' && activeTerm.semester === '2') {
      return `1st Semester ${activeTerm.schoolYear}`;
    }
    if (semester === '2' && activeTerm.semester === '1') {
      return `2nd Semester ${activeTerm.startYear - 1}-${activeTerm.endYear - 1}`;
    }
    return null;
  };

  let modifiedCount = 0;

  for (const student of students) {
    let changed = false;
    if (legacyPattern.test(String(student.academicTerm || '').trim())) {
      const repaired = inferFullLabel(student.academicTerm, student);
      if (repaired) {
        student.academicTerm = repaired;
        modifiedCount += 1;
        changed = true;
      }
    }
    if (legacyPattern.test(String(student.lastEnrolledTerm || '').trim())) {
      const repaired = inferFullLabel(student.lastEnrolledTerm, student);
      if (repaired) {
        student.lastEnrolledTerm = repaired;
        modifiedCount += 1;
        changed = true;
      }
    }
    if (changed) await student.save();
  }

  return modifiedCount;
}

async function findInstructorUser(instructorName, instructorId, session = null) {
  if (instructorId) {
    const assigned = await User.findOne({ _id: instructorId, role: 'instructor' }).select('_id').session(session);
    if (assigned) return assigned._id;
  }

  const normalizedName = String(instructorName || '')
    .replace(/^(prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '')
    .trim()
    .toLowerCase();
  if (!normalizedName || normalizedName === 'tba') return null;

  const instructors = await User.find({ role: 'instructor' }).select('firstName lastName').session(session).lean();
  const match = instructors.find((user) =>
    `${user.firstName} ${user.lastName}`.trim().toLowerCase() === normalizedName
  );
  return match?._id || null;
}

export async function syncOfficialEnrollment(
  student,
  activeTermLabel,
  { actor = null, activateTerm = true, audit = true, session = null, studentUserId = null } = {}
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
    { activate: activateTerm, session }
  );
  const studentUser = studentUserId
    ? { _id: studentUserId }
    : await User.findOne({
        role: 'student',
        username: student.studentId,
      }).select('_id').session(session);

  const offeringIds = [];
  for (const row of scheduleRows) {
    const instructor = await findInstructorUser(row.instructor, row.instructorUserId, session);
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
      { new: true, upsert: true, setDefaultsOnInsert: true, session }
    );
    offeringIds.push(offering._id);

    const existingMembership = await CourseMembership.findOne({
      student: student._id,
      offering: offering._id,
    }).select('status gradeStatus enrolledAt endedAt gradePublishedAt').session(session);
    const preserveCompletion = existingMembership?.status === 'completed'
      || existingMembership?.gradeStatus === 'published';

    await CourseMembership.findOneAndUpdate(
      { student: student._id, offering: offering._id },
      {
        $set: {
          studentUser: studentUser?._id || null,
          term: term._id,
          status: preserveCompletion ? 'completed' : 'enrolled',
          source: 'registrar',
          enrolledAt: existingMembership?.enrolledAt || student.enrolledAt || new Date(),
          endedAt: preserveCompletion
            ? existingMembership?.endedAt || existingMembership?.gradePublishedAt || new Date()
            : null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, session }
    );
  }

  await CourseMembership.updateMany(
    {
      student: student._id,
      term: term._id,
      status: 'enrolled',
      offering: { $nin: offeringIds },
    },
    { $set: { status: 'dropped', endedAt: new Date() } },
    { session }
  );

  if (audit) {
    await AcademicAuditLog.create([{
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
    }], { session });
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
