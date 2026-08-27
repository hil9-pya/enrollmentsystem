import Settings from '../Settings.js';
import Student from '../Student.js';
import AcademicTerm from '../models/AcademicTerm.js';
import CourseMembership from '../models/CourseMembership.js';
import CourseOffering from '../models/CourseOffering.js';
import { nextAcademicTermLabel } from '../academicTermUtils.js';
import { ensureAcademicTerm } from './academicFoundationService.js';
import { runWithOptionalTransaction } from './transactionService.js';

const DEFAULT_TERM = '1st Semester 2026-2027';

function institutionalStudentFilter() {
  return {
    isDeleted: { $ne: true },
    studentId: { $nin: [null, ''] },
  };
}

async function getOrCreateSettings(session = null) {
  let settings = await Settings.findOne().session(session);
  if (!settings) {
    [settings] = await Settings.create([{}], { session });
  }
  return settings;
}

export async function buildTermTransitionPreview(session = null) {
  const settings = await getOrCreateSettings(session);
  const currentTerm = settings.activeTerm || DEFAULT_TERM;
  const nextTerm = nextAcademicTermLabel(currentTerm);
  const currentTermRecord = await AcademicTerm.findOne({ name: currentTerm }).session(session);
  const nextTermRecord = await AcademicTerm.findOne({ name: nextTerm }).session(session);

  const membershipFilter = currentTermRecord ? { term: currentTermRecord._id } : { _id: null };
  const inactiveFilter = {
    ...institutionalStudentFilter(),
    $nor: [{ status: 'enrolled', academicTerm: currentTerm }],
  };

  const [
    unresolvedClasses,
    submittedGrades,
    unsubmittedGrades,
    nextTermOfferings,
    continuingStudents,
    inactiveStudents,
    archiveRisk,
  ] = await Promise.all([
    CourseMembership.countDocuments({ ...membershipFilter, status: 'enrolled' }).session(session),
    CourseMembership.countDocuments({
      ...membershipFilter,
      status: 'enrolled',
      gradeStatus: { $in: ['submitted', 'returned', 'approved'] },
    }).session(session),
    CourseMembership.countDocuments({
      ...membershipFilter,
      status: 'enrolled',
      gradeStatus: 'not_submitted',
    }).session(session),
    nextTermRecord
      ? CourseOffering.countDocuments({ term: nextTermRecord._id, status: { $nin: ['closed', 'archived'] } }).session(session)
      : 0,
    Student.countDocuments({
      ...institutionalStudentFilter(),
      status: 'enrolled',
      academicTerm: currentTerm,
    }).session(session),
    Student.countDocuments(inactiveFilter).session(session),
    Student.countDocuments({ ...inactiveFilter, missedSemesters: { $gte: 1 } }).session(session),
  ]);

  return {
    currentTerm,
    nextTerm,
    canAdvance: unresolvedClasses === 0,
    blockers: unresolvedClasses > 0
      ? [`${unresolvedClasses} active class membership${unresolvedClasses === 1 ? '' : 's'} must be completed, dropped, or withdrawn.`]
      : [],
    counts: {
      unresolvedClasses,
      submittedGrades,
      unsubmittedGrades,
      nextTermOfferings,
      continuingStudents,
      inactiveStudents,
      archiveRisk,
    },
  };
}

export async function advanceAcademicTerm(expectedCurrentTerm, actor = 'System Admin') {
  return runWithOptionalTransaction(async (session) => {
    const preview = await buildTermTransitionPreview(session);
    if (!expectedCurrentTerm || expectedCurrentTerm !== preview.currentTerm) {
      const error = new Error('Active academic term changed. Refresh the preview before trying again.');
      error.statusCode = 409;
      throw error;
    }
    if (!preview.canAdvance) {
      const error = new Error(preview.blockers[0]);
      error.statusCode = 409;
      throw error;
    }

    await ensureAcademicTerm(preview.nextTerm, { activate: false, session });
    const settings = await Settings.findOneAndUpdate(
      { activeTerm: preview.currentTerm },
      { $set: { activeTerm: preview.nextTerm } },
      { new: true, session }
    );
    if (!settings) {
      const error = new Error('Academic term was already advanced by another request. Refresh settings.');
      error.statusCode = 409;
      throw error;
    }

    await ensureAcademicTerm(preview.nextTerm, { activate: true, session });

    const currentEnrolledFilter = {
      ...institutionalStudentFilter(),
      status: 'enrolled',
      academicTerm: preview.currentTerm,
    };
    const inactiveFilter = {
      ...institutionalStudentFilter(),
      $nor: [{ status: 'enrolled', academicTerm: preview.currentTerm }],
    };
    const archivedAt = new Date();

    const continuingResult = await Student.updateMany(
      currentEnrolledFilter,
      { $set: { missedSemesters: 0, lastEnrolledTerm: preview.currentTerm } },
      { session }
    );
    const archivedResult = await Student.updateMany(
      { ...inactiveFilter, missedSemesters: { $gte: 1 } },
      {
        $inc: { missedSemesters: 1 },
        $set: {
          isDeleted: true,
          archivedAt,
          archivedReason: 'Inactive for 2 consecutive semesters',
          archivedBy: actor,
        },
        $push: {
          auditLogs: {
            action: 'Auto-archived due to missing 2 consecutive semesters',
            user: actor,
            date: archivedAt,
          },
        },
      },
      { session }
    );
    const missedResult = await Student.updateMany(
      {
        ...inactiveFilter,
        $or: [
          { missedSemesters: { $exists: false } },
          { missedSemesters: { $lt: 1 } },
        ],
      },
      { $inc: { missedSemesters: 1 } },
      { session }
    );

    return {
      message: 'Semester advanced successfully',
      oldTerm: preview.currentTerm,
      newTerm: preview.nextTerm,
      settings,
      processed: {
        continuingStudents: continuingResult.modifiedCount,
        missedStudents: missedResult.modifiedCount,
        archivedStudents: archivedResult.modifiedCount,
      },
    };
  });
}
