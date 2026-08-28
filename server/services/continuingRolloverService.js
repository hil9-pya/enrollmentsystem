import Settings from '../Settings.js';
import Student from '../Student.js';
import AcademicTerm from '../models/AcademicTerm.js';
import CourseMembership from '../models/CourseMembership.js';
import { parseAcademicTermLabel, nextAcademicTermLabel } from '../academicTermUtils.js';
import { SUBJECTS_CATALOG } from '../subjectsCatalog.js';
import { runWithOptionalTransaction } from './transactionService.js';

function workflowError(message, statusCode = 409) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getPassedSubjectIds(academicRecord = []) {
  return new Set(
    academicRecord
      .filter((record) => Number(record.grade) >= 1 && Number(record.grade) <= 3)
      .map((record) => record.subjectId)
  );
}

function hasCompletedProgram(student) {
  if (!student.programId) return false;
  const requiredSubjects = SUBJECTS_CATALOG.filter((subject) => (
    subject.isActive !== false
    && subject.programId === student.programId
  ));
  if (requiredSubjects.length === 0) return false;
  const passed = getPassedSubjectIds(student.academicRecord);
  return requiredSubjects.every((subject) => passed.has(subject.id));
}

function applyContinuingReset(student, activeTerm, previousTermMetadata, actor) {
  student.lastEnrolledTerm = student.academicTerm;
  student.academicTerm = activeTerm;
  student.selectedSubjects = [];
  student.approvedSubjectIds = [];
  student.scheduleStatus = 'draft';
  student.tuitionBreakdown = [];
  student.totalTuition = 0;
  if (previousTermMetadata.semester === '2') {
    student.yearLevel = Math.min(4, Number(student.yearLevel || 1) + 1);
  }
  student.scheduleGenerated = false;
  student.registrationFormGenerated = false;
  student.receiptGenerated = false;
  student.enrolledAt = null;
  student.paymentMethod = null;
  student.paymentStatus = 'unpaid';
  student.paymentPlan = 'full';
  student.amountPaid = 0;
  student.remainingBalance = 0;
  student.paymentReference = null;
  student.receiptNumber = null;
  student.paymentDetails = {};
  student.walkInQueue = null;
  student.adviserNotes = '';
  student.subjectChangeRequest = '';
  student.missedSemesters = 0;
  student.status = 'advising_pending';
  student.enrollmentType = 'continuing';
  student.auditLogs.push({
    action: `Rolled over to Continuing Student for ${activeTerm}`,
    user: actor,
    date: new Date(),
  });
}

export async function buildTermClosingQueue() {
  const settings = await Settings.findOne();
  if (!settings?.activeTerm) throw workflowError('Active academic term is not configured.', 409);

  const activeTerm = settings.activeTerm;
  const activeTermRecord = await AcademicTerm.findOne({ name: activeTerm }).lean();
  const activeTermFilter = activeTermRecord ? { term: activeTermRecord._id } : { _id: null };

  const candidates = await Student.find({
    isDeleted: { $ne: true },
    studentId: { $nin: [null, ''] },
    status: 'enrolled',
    academicTerm: { $nin: [null, '', activeTerm] },
  })
    .select('studentId firstName lastName programId yearLevel academicTerm academicRecord holds missedSemesters')
    .sort({ lastName: 1, firstName: 1 })
    .lean();

  const previousLabels = [...new Set(candidates.map((student) => student.academicTerm))];
  const previousTerms = await AcademicTerm.find({ name: { $in: previousLabels } }).select('_id name').lean();
  const previousTermMap = new Map(previousTerms.map((term) => [term.name, term]));
  const previousTermIds = previousTerms.map((term) => term._id);
  const candidateIds = candidates.map((student) => String(student._id));
  const unfinishedGroups = previousTermIds.length > 0 && candidateIds.length > 0
    ? await CourseMembership.aggregate([
        {
          $match: {
            student: { $in: candidateIds },
            term: { $in: previousTermIds },
            status: 'enrolled',
          },
        },
        { $group: { _id: '$student', count: { $sum: 1 } } },
      ])
    : [];
  const unfinishedMap = new Map(unfinishedGroups.map((item) => [String(item._id), item.count]));

  const rows = candidates.map((student) => {
    let previousTermMetadata = null;
    let reason = '';
    try {
      previousTermMetadata = parseAcademicTermLabel(student.academicTerm);
    } catch {
      reason = 'Previous academic term is invalid.';
    }
    if (!reason && nextAcademicTermLabel(student.academicTerm) !== activeTerm) {
      reason = 'Student skipped an academic term; returning-student review required.';
    }
    if (!reason && Number(student.missedSemesters || 0) > 0) {
      reason = 'Inactive-semester record requires returning-student review.';
    }
    if (!reason && !previousTermMap.has(student.academicTerm)) {
      reason = 'Previous academic-term record is missing.';
    }
    const unfinishedClasses = unfinishedMap.get(String(student._id)) || 0;
    if (!reason && unfinishedClasses > 0) {
      reason = `${unfinishedClasses} previous-term class${unfinishedClasses === 1 ? '' : 'es'} still active.`;
    }
    const curriculumComplete = hasCompletedProgram(student);
    if (!reason && curriculumComplete) {
      reason = 'Program curriculum complete; graduation review required.';
    }

    return {
      id: String(student._id),
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      programId: student.programId,
      yearLevel: student.yearLevel,
      previousTerm: student.academicTerm,
      targetTerm: activeTerm,
      targetYearLevel: previousTermMetadata?.semester === '2'
        ? Math.min(4, Number(student.yearLevel || 1) + 1)
        : Number(student.yearLevel || 1),
      unfinishedClasses,
      activeHolds: (student.holds || []).filter((hold) => hold.status === 'active').length,
      curriculumComplete,
      eligible: !reason,
      reason,
    };
  });

  const [
    activeClasses,
    unsubmittedGrades,
    submittedGrades,
    returnedGrades,
    approvedGrades,
    completedClasses,
  ] = await Promise.all([
    CourseMembership.countDocuments({ ...activeTermFilter, status: 'enrolled' }),
    CourseMembership.countDocuments({ ...activeTermFilter, status: 'enrolled', gradeStatus: 'not_submitted' }),
    CourseMembership.countDocuments({ ...activeTermFilter, status: 'enrolled', gradeStatus: 'submitted' }),
    CourseMembership.countDocuments({ ...activeTermFilter, status: 'enrolled', gradeStatus: 'returned' }),
    CourseMembership.countDocuments({ ...activeTermFilter, status: 'enrolled', gradeStatus: 'approved' }),
    CourseMembership.countDocuments({ ...activeTermFilter, status: 'completed' }),
  ]);

  return {
    activeTerm,
    nextTerm: nextAcademicTermLabel(activeTerm),
    activeTermStatus: activeTermRecord?.status || 'missing',
    closing: {
      canClose: activeClasses === 0,
      activeClasses,
      unsubmittedGrades,
      submittedGrades,
      returnedGrades,
      approvedGrades,
      completedClasses,
    },
    rollover: {
      total: rows.length,
      eligible: rows.filter((row) => row.eligible).length,
      blocked: rows.filter((row) => !row.eligible).length,
      students: rows,
    },
  };
}

export async function rolloverStudentToActiveTerm(
  studentId,
  { expectedActiveTerm = null, actor = 'System Admin' } = {}
) {
  return runWithOptionalTransaction(async (session) => {
    const settings = await Settings.findOne().session(session);
    if (!settings?.activeTerm) throw workflowError('Active academic term is not configured.');
    if (expectedActiveTerm && settings.activeTerm !== expectedActiveTerm) {
      throw workflowError('Active academic term changed. Refresh rollover queue.');
    }

    const student = await Student.findById(studentId).session(session);
    if (!student) throw workflowError('Student not found.', 404);
    if (student.isDeleted) throw workflowError('Archived students cannot be rolled over.');
    if (student.status !== 'enrolled') {
      throw workflowError('Only fully enrolled students can be rolled over to next semester.', 400);
    }
    if (settings.activeTerm === student.academicTerm) {
      throw workflowError('Student is already assigned to active academic term.');
    }

    let previousTermMetadata;
    try {
      previousTermMetadata = parseAcademicTermLabel(student.academicTerm);
    } catch {
      throw workflowError('Student academic term is invalid. Repair record before rollover.');
    }
    const previousTerm = await AcademicTerm.findOne({ name: student.academicTerm }).session(session);
    if (!previousTerm) {
      throw workflowError('Previous academic-term record is missing. Repair record before rollover.');
    }
    if (nextAcademicTermLabel(student.academicTerm) !== settings.activeTerm || Number(student.missedSemesters || 0) > 0) {
      throw workflowError('Student skipped a term or has an inactivity record. Use returning-student review instead.');
    }
    const unfinishedMembership = await CourseMembership.exists({
      student: student._id,
      term: previousTerm._id,
      status: 'enrolled',
    }).session(session);
    if (unfinishedMembership) {
      throw workflowError('Previous-term classes must have published final grades or recorded drop/withdrawal statuses before re-enrollment.');
    }
    if (hasCompletedProgram(student)) {
      throw workflowError('Program curriculum is complete. Send student for graduation review instead of continuing rollover.');
    }

    applyContinuingReset(student, settings.activeTerm, previousTermMetadata, actor);
    await student.save({ session });
    return student;
  });
}

export async function batchRolloverToActiveTerm(
  studentIds,
  { expectedActiveTerm, actor = 'System Admin' } = {}
) {
  const uniqueIds = [...new Set((studentIds || []).map(String).filter(Boolean))];
  if (uniqueIds.length === 0) throw workflowError('Select at least one eligible student.', 400);
  if (uniqueIds.length > 250) throw workflowError('Batch rollover is limited to 250 students per request.', 400);

  const settings = await Settings.findOne();
  if (!settings?.activeTerm || !expectedActiveTerm || settings.activeTerm !== expectedActiveTerm) {
    throw workflowError('Active academic term changed. Refresh rollover queue.');
  }

  const results = { successful: [], failed: [] };
  for (const studentId of uniqueIds) {
    try {
      const student = await rolloverStudentToActiveTerm(studentId, {
        expectedActiveTerm,
        actor,
      });
      results.successful.push({
        id: String(student._id),
        studentId: student.studentId,
        name: `${student.firstName} ${student.lastName}`.trim(),
      });
    } catch (error) {
      results.failed.push({ id: studentId, reason: error.message });
    }
  }

  return {
    activeTerm: expectedActiveTerm,
    requested: uniqueIds.length,
    ...results,
  };
}
