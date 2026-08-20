import AcademicTerm from '../models/AcademicTerm.js';
import CourseMembership from '../models/CourseMembership.js';
import CourseOffering from '../models/CourseOffering.js';
import Section from '../models/Section.js';
import Student from '../Student.js';

export function isLegacyAcademicTerm(term) {
  return /^(1st|2nd) Semester$/i.test(String(term?.name || '').trim());
}

export async function previewLegacyAcademicCleanup() {
  const legacyTerms = (await AcademicTerm.find({}).lean()).filter(isLegacyAcademicTerm);
  const legacyTermIds = legacyTerms.map((term) => term._id);
  const legacyOfferings = legacyTermIds.length
    ? await CourseOffering.find({ term: { $in: legacyTermIds } }).lean()
    : [];
  const legacyOfferingIds = legacyOfferings.map((offering) => offering._id);
  const legacyMemberships = legacyTermIds.length || legacyOfferingIds.length
    ? await CourseMembership.find({
        $or: [
          ...(legacyTermIds.length ? [{ term: { $in: legacyTermIds } }] : []),
          ...(legacyOfferingIds.length ? [{ offering: { $in: legacyOfferingIds } }] : []),
        ],
      }).lean()
    : [];
  const affectedStudentIds = [...new Set(legacyMemberships.map((membership) => String(membership.student)))];
  const affectedStudents = affectedStudentIds.length
    ? await Student.find({ _id: { $in: affectedStudentIds } })
        .select('_id studentId firstName lastName status academicTerm lastEnrolledTerm selectedSubjects isDeleted')
        .lean()
    : [];
  const validTerms = await AcademicTerm.find({ name: { $regex: /^(1st|2nd) Semester 20\d{2}-20\d{2}$/i } }).lean();
  const validTermByName = new Map(validTerms.map((term) => [String(term.name).toLowerCase(), term]));
  const remainingMembershipCounts = affectedStudentIds.length
    ? await CourseMembership.aggregate([
        {
          $match: {
            student: { $in: affectedStudentIds },
            _id: { $nin: legacyMemberships.map((membership) => membership._id) },
            status: { $in: ['enrolled', 'completed'] },
          },
        },
        { $group: { _id: '$student', count: { $sum: 1 } } },
      ])
    : [];
  const studentsWithRemainingMemberships = new Set(remainingMembershipCounts.map((item) => String(item._id)));
  const studentsWithoutRemainingMemberships = affectedStudentIds.filter((studentId) => !studentsWithRemainingMemberships.has(studentId));
  const rebuildableStudentIds = affectedStudents
    .filter((student) => (
      studentsWithoutRemainingMemberships.includes(String(student._id))
      && student.status === 'enrolled'
      && !student.isDeleted
      && student.studentId
      && student.selectedSubjects?.length > 0
      && /^(1st|2nd) Semester 20\d{2}-20\d{2}$/i.test(student.academicTerm || student.lastEnrolledTerm || '')
    ))
    .map((student) => String(student._id));
  const snapshotMigratableStudentIds = affectedStudents
    .filter((student) => {
      const studentId = String(student._id);
      const targetTerm = student.academicTerm || student.lastEnrolledTerm || '';
      const studentLegacyMemberships = legacyMemberships.filter((membership) => String(membership.student) === studentId);
      return studentsWithoutRemainingMemberships.includes(studentId)
        && student.status === 'enrolled'
        && !student.isDeleted
        && validTermByName.has(targetTerm.toLowerCase())
        && studentLegacyMemberships.length > 0
        && studentLegacyMemberships.every((membership) => (
          legacyOfferings.some((offering) => String(offering._id) === String(membership.offering))
        ));
    })
    .map((student) => String(student._id));
  const unresolvedStudentIds = studentsWithoutRemainingMemberships.filter((studentId) => (
    !snapshotMigratableStudentIds.includes(studentId) && !rebuildableStudentIds.includes(studentId)
  ));
  const gradedMemberships = legacyMemberships.filter((membership) => (
    membership.finalGrade != null || membership.gradeStatus !== 'not_submitted'
  ));

  return {
    generatedAt: new Date().toISOString(),
    legacyTerms,
    legacyOfferings,
    legacyMemberships,
    affectedStudentIds,
    affectedStudents,
    studentsWithoutRemainingMemberships,
    rebuildableStudentIds,
    snapshotMigratableStudentIds,
    unresolvedStudentIds,
    gradedMemberships,
    summary: {
      terms: legacyTerms.length,
      offerings: legacyOfferings.length,
      memberships: legacyMemberships.length,
      affectedStudents: affectedStudentIds.length,
      studentsWithoutRemainingMemberships: studentsWithoutRemainingMemberships.length,
      rebuildableStudents: rebuildableStudentIds.length,
      snapshotMigratableStudents: snapshotMigratableStudentIds.length,
      unresolvedStudents: unresolvedStudentIds.length,
      gradedMemberships: gradedMemberships.length,
    },
  };
}

export async function migrateLegacyMembershipSnapshots(preview) {
  const offeringById = new Map(preview.legacyOfferings.map((offering) => [String(offering._id), offering]));
  const studentById = new Map(preview.affectedStudents.map((student) => [String(student._id), student]));
  let migratedMemberships = 0;

  for (const studentId of preview.snapshotMigratableStudentIds) {
    const student = studentById.get(studentId);
    const targetTermName = student.academicTerm || student.lastEnrolledTerm;
    const targetTerm = await AcademicTerm.findOne({ name: targetTermName });
    if (!targetTerm) throw new Error(`Target term not found for ${studentId}: ${targetTermName}`);

    const memberships = preview.legacyMemberships.filter((membership) => String(membership.student) === studentId);
    for (const membership of memberships) {
      const legacyOffering = offeringById.get(String(membership.offering));
      if (!legacyOffering) throw new Error(`Legacy offering not found for membership ${membership._id}`);
      const targetOffering = await CourseOffering.findOneAndUpdate(
        {
          term: targetTerm._id,
          subjectId: legacyOffering.subjectId,
          sectionKey: legacyOffering.sectionKey,
        },
        {
          $set: {
            subjectCode: legacyOffering.subjectCode,
            subjectName: legacyOffering.subjectName,
            units: legacyOffering.units,
            sectionCode: legacyOffering.sectionCode,
            section: legacyOffering.section || null,
            schedule: legacyOffering.schedule,
            instructorName: legacyOffering.instructorName || 'TBA',
            instructor: legacyOffering.instructor || null,
            capacity: legacyOffering.capacity,
            status: targetTerm.isActive ? 'active' : 'closed',
          },
          $setOnInsert: { lmsEnabled: false },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      await CourseMembership.findOneAndUpdate(
        { student: membership.student, offering: targetOffering._id },
        {
          $set: {
            studentUser: membership.studentUser || null,
            term: targetTerm._id,
            status: membership.status,
            source: 'migration',
            enrolledAt: membership.enrolledAt,
            endedAt: membership.endedAt || null,
            finalGrade: membership.finalGrade,
            gradeStatus: membership.gradeStatus,
            gradeSubmittedAt: membership.gradeSubmittedAt || null,
            gradeReviewedAt: membership.gradeReviewedAt || null,
            gradePublishedAt: membership.gradePublishedAt || null,
            gradeReviewNotes: membership.gradeReviewNotes || '',
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      migratedMemberships += 1;
    }
  }

  return { migratedMemberships };
}

export async function applyLegacyAcademicCleanup(preview) {
  const termIds = preview.legacyTerms.map((term) => term._id);
  const offeringIds = preview.legacyOfferings.map((offering) => offering._id);
  const membershipIds = preview.legacyMemberships.map((membership) => membership._id);

  const membershipsResult = membershipIds.length
    ? await CourseMembership.deleteMany({ _id: { $in: membershipIds } })
    : { deletedCount: 0 };
  const offeringsResult = offeringIds.length
    ? await CourseOffering.deleteMany({ _id: { $in: offeringIds } })
    : { deletedCount: 0 };
  const termsResult = termIds.length
    ? await AcademicTerm.deleteMany({ _id: { $in: termIds } })
    : { deletedCount: 0 };

  const sections = await Section.find({}).select('+enrolledStudentIds');
  let recalculatedSections = 0;
  for (const section of sections) {
    const expectedCount = section.enrolledStudentIds?.length || 0;
    if (section.enrolledCount !== expectedCount) {
      section.enrolledCount = expectedCount;
      await section.save();
      recalculatedSections += 1;
    }
  }

  return {
    deletedMemberships: membershipsResult.deletedCount || 0,
    deletedOfferings: offeringsResult.deletedCount || 0,
    deletedTerms: termsResult.deletedCount || 0,
    recalculatedSections,
    affectedStudentIds: preview.affectedStudentIds,
    studentsWithoutRemainingMemberships: preview.studentsWithoutRemainingMemberships,
  };
}
