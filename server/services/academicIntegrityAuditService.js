import AcademicTerm from '../models/AcademicTerm.js';
import CourseMembership from '../models/CourseMembership.js';
import CourseOffering from '../models/CourseOffering.js';
import Section from '../models/Section.js';
import Student from '../Student.js';
import User from '../User.js';
import { isLegacyAcademicTerm } from './legacyAcademicCleanupService.js';

const ACTIVE_MEMBERSHIP_STATUSES = new Set(['enrolled']);
const CLOSED_TERM_STATUSES = new Set(['closed', 'archived']);

function idOf(value) {
  return value == null ? '' : String(value);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function sameTermLabel(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return true;
  if (a === b) return true;
  return /^(1st|2nd) semester$/i.test(a) ? b.startsWith(a) : /^(1st|2nd) semester$/i.test(b) && a.startsWith(b);
}

function offeringKey(offering) {
  return [idOf(offering.term), normalize(offering.subjectId), normalize(offering.sectionCode)].join('|');
}

export async function buildAcademicIntegrityAudit() {
  const [terms, offerings, memberships, sections, students, users] = await Promise.all([
    AcademicTerm.find({}).lean(),
    CourseOffering.find({}).lean(),
    CourseMembership.find({}).lean(),
    Section.find({}).select('+enrolledStudentIds').lean(),
    Student.find({}).select('_id studentId firstName lastName academicTerm lastEnrolledTerm isDeleted').lean(),
    User.find({ role: 'instructor' }).select('_id username firstName lastName email role').lean(),
  ]);

  const termById = new Map(terms.map((term) => [idOf(term._id), term]));
  const offeringById = new Map(offerings.map((offering) => [idOf(offering._id), offering]));
  const sectionById = new Map(sections.map((section) => [idOf(section._id), section]));
  const studentById = new Map(students.map((student) => [idOf(student._id), student]));
  const instructorById = new Map(users.map((user) => [idOf(user._id), user]));
  const membershipCountByOffering = new Map();
  const activeMembershipsByOffering = new Map();
  const issues = [];
  let sequence = 0;

  function addIssue(type, severity, title, description, records, recommendedAction) {
    sequence += 1;
    issues.push({
      id: `${type}-${sequence}`,
      type,
      severity,
      title,
      description,
      records,
      recommendedAction,
    });
  }

  for (const membership of memberships) {
    const offeringId = idOf(membership.offering);
    membershipCountByOffering.set(offeringId, (membershipCountByOffering.get(offeringId) || 0) + 1);
    if (ACTIVE_MEMBERSHIP_STATUSES.has(membership.status)) {
      if (!activeMembershipsByOffering.has(offeringId)) activeMembershipsByOffering.set(offeringId, []);
      activeMembershipsByOffering.get(offeringId).push(membership);
    }
  }

  const duplicateOfferingGroups = new Map();
  for (const offering of offerings.filter((item) => item.status !== 'archived')) {
    const key = offeringKey(offering);
    if (!duplicateOfferingGroups.has(key)) duplicateOfferingGroups.set(key, []);
    duplicateOfferingGroups.get(key).push(offering);
  }
  for (const group of duplicateOfferingGroups.values()) {
    if (group.length < 2) continue;
    const term = termById.get(idOf(group[0].term));
    const legacyTerm = isLegacyAcademicTerm(term);
    const membershipCount = group.reduce((sum, offering) => sum + (membershipCountByOffering.get(idOf(offering._id)) || 0), 0);
    addIssue(
      legacyTerm ? 'legacy_duplicate_offering' : 'duplicate_offering',
      legacyTerm ? 'info' : membershipCount > 0 ? 'critical' : 'warning',
      `Duplicate ${group[0].subjectCode} ${group[0].sectionCode}`,
      `${group.length} offerings represent the same subject, section, and term${membershipCount ? ` with ${membershipCount} memberships attached` : ''}.`,
      {
        term: term?.name || idOf(group[0].term),
        offeringIds: group.map((offering) => idOf(offering._id)),
        subjectCode: group[0].subjectCode,
        sectionCode: group[0].sectionCode,
      },
      'Choose one canonical offering, then review and merge memberships before archiving duplicates.'
    );
  }

  const logicalMembershipGroups = new Map();
  for (const membership of memberships) {
    const offering = offeringById.get(idOf(membership.offering));
    if (!offering) continue;
    const key = [idOf(membership.student), offeringKey(offering)].join('|');
    if (!logicalMembershipGroups.has(key)) logicalMembershipGroups.set(key, []);
    logicalMembershipGroups.get(key).push(membership);
  }
  for (const group of logicalMembershipGroups.values()) {
    if (group.length < 2) continue;
    const offering = offeringById.get(idOf(group[0].offering));
    addIssue(
      'duplicate_membership',
      'critical',
      'Student appears more than once in one class',
      `${idOf(group[0].student)} has ${group.length} memberships for ${offering?.subjectCode || 'an unknown subject'} ${offering?.sectionCode || ''}.`,
      { studentId: idOf(group[0].student), membershipIds: group.map((item) => idOf(item._id)) },
      'Keep membership containing authoritative grade and enrollment history; merge only after manual review.'
    );
  }

  for (const membership of memberships) {
    const membershipId = idOf(membership._id);
    const offering = offeringById.get(idOf(membership.offering));
    const student = studentById.get(idOf(membership.student));

    if (!offering) {
      addIssue(
        'missing_offering',
        'critical',
        'Membership has no course offering',
        `Membership ${membershipId} points to a missing offering.`,
        { membershipId, studentId: idOf(membership.student), offeringId: idOf(membership.offering) },
        'Recover or map the original offering before changing this membership.'
      );
      continue;
    }
    if (!student) {
      addIssue(
        'missing_student',
        'critical',
        'Membership has no student record',
        `Membership ${membershipId} points to missing student ${idOf(membership.student)}.`,
        { membershipId, studentId: idOf(membership.student), offeringId: idOf(offering._id) },
        'Recover the student record or archive the orphan membership after manual review.'
      );
    }

    const term = termById.get(idOf(offering.term));
    if (idOf(membership.term) !== idOf(offering.term)) {
      addIssue(
        'membership_term_mismatch',
        'critical',
        'Membership and offering use different terms',
        `Membership ${membershipId} stores a different term from its course offering.`,
        { membershipId, membershipTermId: idOf(membership.term), offeringTermId: idOf(offering.term), offeringId: idOf(offering._id) },
        'Confirm correct term using enrollment documents before aligning both records.'
      );
    }

    if (ACTIVE_MEMBERSHIP_STATUSES.has(membership.status)) {
      if (term && (CLOSED_TERM_STATUSES.has(term.status) || !term.isActive)) {
        const legacyTerm = isLegacyAcademicTerm(term);
        addIssue(
          legacyTerm ? 'legacy_membership' : 'active_membership_wrong_term',
          legacyTerm ? 'info' : 'critical',
          legacyTerm ? 'Legacy membership remains in generic term' : 'Enrolled membership belongs to inactive term',
          `${idOf(membership.student)} remains enrolled in ${offering.subjectCode} ${offering.sectionCode}, but ${term.name} is ${term.status}.`,
          { membershipId, studentId: idOf(membership.student), offeringId: idOf(offering._id), term: term.name },
          'Verify student schedule, then move membership to correct active offering or complete historical enrollment.'
        );
      }
      if (student?.isDeleted) {
        addIssue(
          'archived_student_active_membership',
          'critical',
          'Archived student still has active membership',
          `${idOf(student._id)} is archived but remains enrolled in ${offering.subjectCode} ${offering.sectionCode}.`,
          { membershipId, studentId: idOf(student._id), offeringId: idOf(offering._id) },
          'Review archive reason; restore student or close membership before LMS synchronization.'
        );
      }
      const expectedTerm = student?.academicTerm || student?.lastEnrolledTerm;
      if (term && !isLegacyAcademicTerm(term) && expectedTerm && !sameTermLabel(term.name, expectedTerm)) {
        addIssue(
          'student_term_mismatch',
          'warning',
          'Student profile and class term differ',
          `${idOf(student?._id)} lists ${expectedTerm}, but membership uses ${term.name}.`,
          { membershipId, studentId: idOf(student?._id), studentTerm: expectedTerm, offeringTerm: term.name },
          'Compare registrar record and official enrollment documents before selecting correct term.'
        );
      }
      const section = sectionById.get(idOf(offering.section));
      if (section && !(section.enrolledStudentIds || []).map(String).includes(idOf(membership.student))) {
        addIssue(
          'membership_missing_reservation',
          'warning',
          'Official member missing from section reservation list',
          `${idOf(membership.student)} belongs to ${offering.subjectCode} ${offering.sectionCode}, but section capacity markers omit the student.`,
          { membershipId, studentId: idOf(membership.student), sectionId: idOf(section._id), offeringId: idOf(offering._id) },
          'Recalculate section reservations only after duplicate memberships are resolved.'
        );
      }
    }

    if (membership.gradeStatus === 'published' && membership.status !== 'completed') {
      addIssue(
        'published_grade_status_mismatch',
        'critical',
        'Published grade is not marked completed',
        `Membership ${membershipId} has a published grade but status ${membership.status}.`,
        { membershipId, studentId: idOf(membership.student), offeringId: idOf(offering._id) },
        'Verify published grade, then align membership completion status.'
      );
    }
  }

  for (const offering of offerings) {
    const offeringId = idOf(offering._id);
    const term = termById.get(idOf(offering.term));
    const legacyTerm = isLegacyAcademicTerm(term);
    const activeMemberships = activeMembershipsByOffering.get(offeringId) || [];
    if (!term) {
      addIssue(
        'missing_term',
        'critical',
        'Course offering has no academic term',
        `${offering.subjectCode} ${offering.sectionCode} points to missing term ${idOf(offering.term)}.`,
        { offeringId, termId: idOf(offering.term) },
        'Recover or map the term before using this offering.'
      );
    } else if (CLOSED_TERM_STATUSES.has(term.status) && ['open', 'active'].includes(offering.status)) {
      addIssue(
        legacyTerm ? 'legacy_offering_status' : 'offering_term_status_mismatch',
        legacyTerm ? 'info' : 'warning',
        'Offering status conflicts with term status',
        `${offering.subjectCode} ${offering.sectionCode} is ${offering.status}, while ${term.name} is ${term.status}.`,
        { offeringId, offeringStatus: offering.status, termStatus: term.status, term: term.name },
        'Close offering after confirming no active enrollment should remain.'
      );
    }

    if (offering.section && !sectionById.has(idOf(offering.section))) {
      addIssue(
        'missing_section',
        legacyTerm ? 'info' : activeMemberships.length ? 'warning' : 'info',
        'Offering points to deleted section',
        `${offering.subjectCode} ${offering.sectionCode} keeps its snapshot, but source section no longer exists.`,
        {
          offeringId,
          sectionId: idOf(offering.section),
          subjectId: offering.subjectId,
          subjectCode: offering.subjectCode,
          sectionCode: offering.sectionCode,
          schedule: `${offering.schedule?.day || 'TBA'} ${offering.schedule?.time || 'TBA'} · ${offering.schedule?.room || 'TBA'}`,
          activeMembershipCount: activeMemberships.length,
        },
        activeMemberships.length
          ? 'Map offering to correct live section before LMS synchronization.'
          : 'Keep snapshot for history; no repair required unless class must become active again.'
      );
    }

    const namedInstructor = normalize(offering.instructorName) && normalize(offering.instructorName) !== 'tba';
    if (offering.instructor && !instructorById.has(idOf(offering.instructor))) {
      addIssue(
        'missing_instructor_account',
        'critical',
        'Offering points to invalid instructor account',
        `${offering.subjectCode} ${offering.sectionCode} references a missing or non-instructor user.`,
        { offeringId, instructorId: idOf(offering.instructor), instructorName: offering.instructorName },
        'Assign a valid instructor account from Course Management.'
      );
    } else if (!offering.instructor && namedInstructor) {
      addIssue(
        'unlinked_instructor',
        legacyTerm ? 'info' : activeMemberships.length ? 'critical' : 'warning',
        'Instructor name is not linked to portal account',
        `${offering.instructorName} appears on ${offering.subjectCode} ${offering.sectionCode}, but no instructor account is linked.`,
        { offeringId, instructorName: offering.instructorName, activeMembershipCount: activeMemberships.length },
        'Select matching instructor account before LMS synchronization.'
      );
    }

    if (activeMemberships.length) {
      const missingFields = [];
      if (!offering.subjectCode || !offering.subjectName) missingFields.push('subject');
      if (!offering.sectionCode) missingFields.push('section code');
      if (!offering.schedule?.day || normalize(offering.schedule.day) === 'tba') missingFields.push('day');
      if (!offering.schedule?.time || normalize(offering.schedule.time) === 'tba') missingFields.push('time');
      if (!offering.schedule?.room || normalize(offering.schedule.room) === 'tba') missingFields.push('room');
      if (missingFields.length) {
        addIssue(
          'incomplete_offering_snapshot',
          legacyTerm ? 'info' : 'warning',
          'Active offering has incomplete schedule data',
          `${offering.subjectCode} ${offering.sectionCode} is missing ${missingFields.join(', ')} used by portals and PDFs.`,
          { offeringId, missingFields, activeMembershipCount: activeMemberships.length },
          'Verify section schedule and update official offering snapshot before generating documents.'
        );
      }
    }
  }

  for (const section of sections) {
    const markers = (section.enrolledStudentIds || []).map(String);
    if (section.enrolledCount !== markers.length) {
      addIssue(
        'section_count_drift',
        'warning',
        'Section enrollment count is out of sync',
        `${section.sectionCode} stores count ${section.enrolledCount}, but reservation list contains ${markers.length}.`,
        { sectionId: idOf(section._id), storedCount: section.enrolledCount, reservationCount: markers.length },
        'Recalculate count from reservation list after duplicate and membership issues are resolved.'
      );
    }
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };
  issues.sort((left, right) => severityRank[left.severity] - severityRank[right.severity] || left.type.localeCompare(right.type));
  const counts = issues.reduce((result, issue) => {
    result[issue.severity] += 1;
    return result;
  }, { critical: 0, warning: 0, info: 0 });

  return {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    summary: {
      totalIssues: issues.length,
      ...counts,
      offeringsScanned: offerings.length,
      membershipsScanned: memberships.length,
      sectionsScanned: sections.length,
    },
    issues,
  };
}
