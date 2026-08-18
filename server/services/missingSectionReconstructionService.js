import AcademicAuditLog from '../models/AcademicAuditLog.js';
import AcademicTerm from '../models/AcademicTerm.js';
import CourseMembership from '../models/CourseMembership.js';
import CourseOffering from '../models/CourseOffering.js';
import Section from '../models/Section.js';

function idOf(value) {
  return value == null ? '' : String(value);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function sectionKey(subjectId, sectionCode) {
  return `${normalize(subjectId)}|${normalize(sectionCode)}`;
}

function scheduleMatches(section, offering) {
  return normalize(section.days) === normalize(offering.schedule?.day)
    && normalize(section.time) === normalize(offering.schedule?.time)
    && normalize(section.room) === normalize(offering.schedule?.room);
}

export async function previewMissingSectionReconstruction() {
  const [terms, offerings, memberships, sections] = await Promise.all([
    AcademicTerm.find({}).lean(),
    CourseOffering.find({ section: { $ne: null } }).lean(),
    CourseMembership.find({ status: 'enrolled' }).lean(),
    Section.find({}).select('+enrolledStudentIds').lean(),
  ]);
  const termById = new Map(terms.map((term) => [idOf(term._id), term]));
  const sectionById = new Map(sections.map((section) => [idOf(section._id), section]));
  const sectionByKey = new Map(sections.map((section) => [sectionKey(section.subjectId, section.sectionCode), section]));
  const membershipsByOffering = new Map();
  for (const membership of memberships) {
    const offeringId = idOf(membership.offering);
    if (!membershipsByOffering.has(offeringId)) membershipsByOffering.set(offeringId, []);
    membershipsByOffering.get(offeringId).push(membership);
  }

  const plans = [];
  const skipped = [];
  const conflicts = [];
  for (const offering of offerings) {
    if (sectionById.has(idOf(offering.section))) continue;
    const activeMemberships = membershipsByOffering.get(idOf(offering._id)) || [];
    const term = termById.get(idOf(offering.term));
    const record = {
      offering,
      term,
      missingSectionId: idOf(offering.section),
      studentIds: [...new Set(activeMemberships.map((membership) => idOf(membership.student)))],
    };
    if (!activeMemberships.length) {
      skipped.push({ ...record, reason: 'no_active_memberships' });
      continue;
    }
    if (!term || term.status !== 'active' || !term.isActive || !['open', 'active'].includes(offering.status)) {
      skipped.push({ ...record, reason: 'inactive_term_or_offering' });
      continue;
    }
    const matchingSection = sectionByKey.get(sectionKey(offering.subjectId, offering.sectionCode));
    if (!matchingSection) {
      plans.push({ ...record, action: 'recreate_original_id' });
    } else if (scheduleMatches(matchingSection, offering)) {
      plans.push({ ...record, action: 'relink_existing', matchingSection });
    } else {
      conflicts.push({ ...record, reason: 'section_code_schedule_conflict', matchingSection });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    plans,
    skipped,
    conflicts,
    summary: {
      candidates: plans.length,
      recreateOriginalId: plans.filter((plan) => plan.action === 'recreate_original_id').length,
      relinkExisting: plans.filter((plan) => plan.action === 'relink_existing').length,
      skipped: skipped.length,
      conflicts: conflicts.length,
      activeMemberships: plans.reduce((total, plan) => total + plan.studentIds.length, 0),
    },
  };
}

export async function applyMissingSectionReconstruction(preview, { actor = null, actorRole = 'system' } = {}) {
  if (preview.conflicts.length) {
    throw new Error(`Cannot reconstruct sections while ${preview.conflicts.length} section-code conflict(s) remain.`);
  }
  let recreatedSections = 0;
  let relinkedOfferings = 0;
  let restoredReservations = 0;

  for (const plan of preview.plans) {
    const offering = await CourseOffering.findById(plan.offering._id);
    if (!offering) continue;
    const currentSection = await Section.findById(offering.section).select('+enrolledStudentIds');
    if (currentSection) continue;

    const memberships = await CourseMembership.find({ offering: offering._id, status: 'enrolled' }).lean();
    const studentIds = [...new Set(memberships.map((membership) => idOf(membership.student)))];
    let section;
    let action;

    if (plan.action === 'relink_existing') {
      section = await Section.findById(plan.matchingSection._id).select('+enrolledStudentIds');
      if (!section || !scheduleMatches(section, offering)) {
        throw new Error(`Matching section changed for ${offering.subjectCode} ${offering.sectionCode}. Run preview again.`);
      }
      const markers = new Set((section.enrolledStudentIds || []).map(String));
      for (const studentId of studentIds) markers.add(studentId);
      section.enrolledStudentIds = [...markers];
      section.enrolledCount = markers.size;
      section.maxSlots = Math.max(section.maxSlots, markers.size);
      await section.save();
      offering.section = section._id;
      await offering.save();
      relinkedOfferings += 1;
      action = 'relinked_missing_offering_section';
    } else {
      const duplicate = await Section.findOne({ subjectId: offering.subjectId, sectionCode: offering.sectionCode });
      if (duplicate) throw new Error(`Section ${offering.subjectCode} ${offering.sectionCode} now exists. Run preview again.`);
      section = await Section.create({
        _id: offering.section,
        subjectId: offering.subjectId,
        sectionCode: offering.sectionCode,
        days: offering.schedule?.day || 'TBA',
        time: offering.schedule?.time || 'TBA',
        room: offering.schedule?.room || '',
        instructor: offering.instructorName || 'TBA',
        instructorUser: offering.instructor || null,
        maxSlots: Math.max(offering.capacity || 40, studentIds.length, 1),
        enrolledCount: studentIds.length,
        enrolledStudentIds: studentIds,
        isActive: true,
      });
      recreatedSections += 1;
      action = 'recreated_missing_section';
    }
    restoredReservations += studentIds.length;
    await AcademicAuditLog.create({
      actor: actor?._id || null,
      actorRole,
      action,
      entityType: 'section',
      entityId: idOf(section._id),
      metadata: {
        offeringId: idOf(offering._id),
        subjectId: offering.subjectId,
        sectionCode: offering.sectionCode,
        restoredReservations: studentIds.length,
        source: 'offering_snapshot',
      },
    });
  }

  return { recreatedSections, relinkedOfferings, restoredReservations };
}
