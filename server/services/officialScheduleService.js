import CourseMembership from '../models/CourseMembership.js';
import '../models/CourseOffering.js';
import '../models/AcademicTerm.js';
import '../User.js';

function getInstructorName(offering) {
  const instructor = offering?.instructor;
  const accountName = instructor
    ? `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim()
    : '';
  return accountName || offering?.instructorName || 'TBA';
}

function getTermLabel(term, fallback) {
  if (!term) return fallback || '';
  const termName = String(term.name || '').trim();
  const fallbackName = String(fallback || '').trim();
  if (
    /^(1st|2nd) Semester$/i.test(termName)
    && fallbackName.startsWith(termName)
    && /20\d{2}-20\d{2}$/.test(fallbackName)
  ) {
    return fallbackName;
  }
  if (term.schoolYear && !String(term.name || '').includes(term.schoolYear)) {
    return `${term.name} ${term.schoolYear}`.trim();
  }
  return termName || fallbackName;
}

/**
 * Return the Registrar-created class snapshot for an officially enrolled student.
 * Offerings deliberately retain schedule details even when a live Section is later
 * edited or removed, so official documents never guess from the current catalog.
 */
export async function getOfficialEnrollmentSchedule(student) {
  const memberships = await CourseMembership.find({
    student: student._id,
    status: 'enrolled',
  })
    .populate({
      path: 'offering',
      populate: [
        { path: 'term', select: 'name schoolYear semester' },
        { path: 'instructor', select: 'firstName lastName username' },
      ],
    })
    .sort({ enrolledAt: 1, createdAt: 1 });

  return memberships
    .filter((membership) => membership.offering)
    .map((membership) => {
      const offering = membership.offering;
      return {
        subjectId: offering.subjectId,
        subjectCode: offering.subjectCode,
        subjectName: offering.subjectName,
        units: offering.units,
        sectionId: offering.sectionKey,
        sectionDatabaseId: offering.section || null,
        sectionCode: offering.sectionCode,
        schedule: {
          day: offering.schedule?.day || 'TBA',
          time: offering.schedule?.time || 'TBA',
          room: offering.schedule?.room || 'TBA',
        },
        instructor: getInstructorName(offering),
        instructorUserId: offering.instructor?._id || offering.instructor || null,
        maxSlots: offering.capacity || 40,
        academicTerm: getTermLabel(
          offering.term,
          student.lastEnrolledTerm || student.academicTerm
        ),
      };
    });
}
