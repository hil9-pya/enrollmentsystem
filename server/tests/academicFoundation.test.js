import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Student from '../Student.js';
import User from '../User.js';
import Section from '../models/Section.js';
import CourseOffering from '../models/CourseOffering.js';
import CourseMembership from '../models/CourseMembership.js';
import AcademicTerm from '../models/AcademicTerm.js';
import AcademicAuditLog from '../models/AcademicAuditLog.js';
import { getEnrolledSchedule, submitSchedule } from '../schedulerController.js';
import {
  assignOfferingInstructor,
  getOfferingRoster,
  getMyClasses,
  linkOfferingSection,
  publishFinalGrade,
  repairDeterministicIntegrityIssues,
  repairMembershipReservation,
  reviewFinalGrade,
  submitFinalGrade,
} from '../academicController.js';
import { parseAcademicTermLabel, repairStoredAcademicTermLabel } from '../academicTermUtils.js';
import { confirmPayment, validateEnrollment } from '../studentsController.js';
import { generateApplicantToken, protectStudentRecord } from '../studentAccessMiddleware.js';
import { updateSection } from '../adminSchedulerController.js';
import { buildAcademicIntegrityAudit } from '../services/academicIntegrityAuditService.js';
import { syncOfficialEnrollment } from '../services/academicFoundationService.js';
import {
  applyMissingSectionReconstruction,
  previewMissingSectionReconstruction,
} from '../services/missingSectionReconstructionService.js';

function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, payload });
        return this;
      },
    };
    handler(req, res, reject);
  });
}

test('official enrollment creates one roster membership and grade publication updates official record', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const instructor = await User.create({
      username: 'inst1',
      email: 'inst1@test.local',
      password: 'password123',
      firstName: 'Renato',
      lastName: 'Villanueva',
      role: 'instructor',
    });
    const registrar = await User.create({
      username: 'reg1',
      email: 'reg1@test.local',
      password: 'password123',
      firstName: 'Reg',
      lastName: 'Officer',
      role: 'registrar',
    });
    const studentUser = await User.create({
      username: 'STU-2026-9999',
      email: 'student@test.local',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Student',
      role: 'student',
      studentProfile: 'APP-2026-9999',
    });

    const section = await Section.create({
      subjectId: 'cs101',
      sectionCode: 'CS 101-A',
      days: 'MWF',
      time: '8:00 AM - 9:30 AM',
      room: '301',
      instructor: 'Renato Villanueva',
      instructorUser: instructor._id,
      maxSlots: 40,
    });
    let student = await Student.create({
      _id: 'APP-2026-9999',
      studentId: 'STU-2026-9999',
      firstName: 'Test',
      lastName: 'Student',
      status: 'advising_approved',
      academicTerm: '1st Semester 2026-2027',
      totalTuition: 9000,
      paymentPlan: 'downpayment',
      selectedSubjects: [{ subjectId: 'cs101', sectionId: String(section._id) }],
    });

    await invoke(submitSchedule, { params: { studentId: student._id }, body: {} });
    await invoke(submitSchedule, { params: { studentId: student._id }, body: {} });
    assert.equal((await Section.findById(section._id)).enrolledCount, 1);

    student = await Student.findById(student._id);
    student.status = 'payment_pending';
    await student.save();
    const payment = await invoke(confirmPayment, {
      params: { id: student._id },
      body: {},
      user: { username: 'accounting-test' },
    });
    assert.equal(payment.status, 200);
    assert.equal(payment.payload.status, 'payment_confirmed');
    assert.equal(payment.payload.paymentStatus, 'partial');
    assert.equal(payment.payload.amountPaid, 3000);
    assert.equal(payment.payload.remainingBalance, 6000);
    assert.ok(payment.payload.receiptNumber);

    const validation = await invoke(validateEnrollment, {
      params: { id: student._id },
      body: {},
      user: registrar,
    });
    assert.equal(validation.status, 200);
    assert.equal(validation.payload.status, 'enrolled');

    let membership = await CourseMembership.findOne({ student: student._id }).populate('offering');
    assert.ok(membership);
    assert.equal(String(membership.offering.instructor), String(instructor._id));

    const legacyTerm = await AcademicTerm.create({
      code: 'LEGACY-FIRST-SEMESTER',
      name: '1st Semester',
      semester: '1',
      status: 'closed',
    });
    membership.offering.term = legacyTerm._id;
    await membership.offering.save();

    const activeOnlyClasses = await invoke(getMyClasses, { user: instructor });
    assert.equal(activeOnlyClasses.status, 200);
    assert.equal(activeOnlyClasses.payload.data.length, 0);

    await Section.findByIdAndDelete(section._id);
    const officialSchedule = await invoke(getEnrolledSchedule, {
      params: { studentId: student._id },
      body: {},
    });
    assert.equal(officialSchedule.status, 200);
    assert.equal(officialSchedule.payload.data.length, 1);
    assert.equal(officialSchedule.payload.data[0].sectionCode, 'CS 101-A');
    assert.deepEqual(officialSchedule.payload.data[0].schedule, {
      day: 'MWF',
      time: '8:00 AM - 9:30 AM',
      room: '301',
    });
    assert.equal(officialSchedule.payload.data[0].instructor, 'Renato Villanueva');
    assert.equal(officialSchedule.payload.data[0].academicTerm, '1st Semester 2026-2027');

    await invoke(submitFinalGrade, {
      params: { id: membership._id },
      body: { grade: 1.75 },
      user: instructor,
    });
    const privatePendingGrade = await invoke(getMyClasses, { user: studentUser });
    assert.equal(privatePendingGrade.status, 200);
    assert.equal(privatePendingGrade.payload.data.length, 1);
    assert.equal(privatePendingGrade.payload.data[0].finalGrade, null);
    assert.equal(privatePendingGrade.payload.data[0].offering.term.name, '1st Semester 2026-2027');
    const returnedGrade = await invoke(reviewFinalGrade, {
      params: { id: membership._id },
      body: { action: 'return', notes: 'Verify the encoded class record.' },
      user: registrar,
    });
    assert.equal(returnedGrade.status, 200);
    assert.equal(returnedGrade.payload.data.gradeStatus, 'returned');
    assert.equal(returnedGrade.payload.data.gradeReviewNotes, 'Verify the encoded class record.');

    const resubmittedGrade = await invoke(submitFinalGrade, {
      params: { id: membership._id },
      body: { grade: 1.75 },
      user: instructor,
    });
    assert.equal(resubmittedGrade.status, 200);
    assert.equal(resubmittedGrade.payload.data.gradeStatus, 'submitted');
    assert.equal(resubmittedGrade.payload.data.gradeReviewNotes, '');

    await invoke(reviewFinalGrade, {
      params: { id: membership._id },
      body: { action: 'approve' },
      user: registrar,
    });
    await invoke(publishFinalGrade, {
      params: { id: membership._id },
      body: {},
      user: registrar,
    });

    membership = await CourseMembership.findById(membership._id);
    student = await Student.findById(student._id);
    assert.equal(membership.gradeStatus, 'published');
    assert.equal(student.academicRecord.length, 1);
    assert.equal(student.academicRecord[0].grade, 1.75);

    const visiblePublishedGrade = await invoke(getMyClasses, { user: studentUser });
    assert.equal(visiblePublishedGrade.status, 200);
    assert.equal(visiblePublishedGrade.payload.data.length, 1);
    assert.equal(visiblePublishedGrade.payload.data[0].status, 'completed');
    assert.equal(visiblePublishedGrade.payload.data[0].finalGrade, 1.75);

    const publishedRoster = await invoke(getOfferingRoster, {
      params: { id: membership.offering },
      user: instructor,
    });
    assert.equal(publishedRoster.status, 200);
    assert.equal(publishedRoster.payload.data.length, 1);
    assert.equal(publishedRoster.payload.data[0].gradeStatus, 'published');

  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('section instructor assignment requires an account and synchronizes official offerings', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const instructor = await User.create({
      username: 'linked-instructor',
      email: 'linked-instructor@test.local',
      password: 'password123',
      firstName: 'Lina',
      lastName: 'Santos',
      role: 'instructor',
    });
    const term = await AcademicTerm.create({
      code: 'AY2026-2027-1',
      name: '1st Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '1',
      status: 'active',
      isActive: true,
    });
    const section = await Section.create({
      subjectId: 'cs101',
      sectionCode: 'CS-11M1',
      days: 'MWF',
      time: '8:00 AM - 9:30 AM',
      instructor: 'Legacy Name',
      maxSlots: 40,
    });
    const offering = await CourseOffering.create({
      term: term._id,
      subjectId: 'cs101',
      subjectCode: 'CS 101',
      subjectName: 'Intro to Computing',
      units: 3,
      sectionKey: String(section._id),
      sectionCode: section.sectionCode,
      section: section._id,
      instructorName: 'Legacy Name',
      status: 'active',
    });

    const rejected = await invoke(updateSection, {
      params: { id: section._id },
      body: { instructor: 'Another Plain Name', instructorUser: '' },
    });
    assert.equal(rejected.status, 400);
    assert.match(rejected.payload.message, /instructor account/i);

    const linked = await invoke(updateSection, {
      params: { id: section._id },
      body: { instructorUser: String(instructor._id) },
    });
    assert.equal(linked.status, 200);
    assert.equal(linked.payload.updatedOfferings, 1);

    const updatedSection = await Section.findById(section._id);
    const updatedOffering = await CourseOffering.findById(offering._id);
    assert.equal(String(updatedSection.instructorUser), String(instructor._id));
    assert.equal(updatedSection.instructor, 'Lina Santos');
    assert.equal(String(updatedOffering.instructor), String(instructor._id));
    assert.equal(updatedOffering.instructorName, 'Lina Santos');
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('admin can link instructor directly to orphan offering and clear integrity finding', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const instructor = await User.create({
      username: 'direct-link-instructor',
      email: 'direct-link@test.local',
      password: 'password123',
      firstName: 'Mara',
      lastName: 'Reyes',
      role: 'instructor',
    });
    const term = await AcademicTerm.create({
      code: 'AY2026-2027-DIRECT',
      name: '1st Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '1',
      status: 'active',
      isActive: true,
    });
    const offering = await CourseOffering.create({
      term: term._id,
      subjectId: 'cs101',
      subjectCode: 'CS 101',
      subjectName: 'Intro to Computing',
      units: 3,
      sectionKey: 'deleted-section-snapshot',
      sectionCode: 'CS-11M1',
      section: null,
      schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: '1101' },
      instructorName: 'Mara Reyes',
      status: 'active',
    });

    const before = await buildAcademicIntegrityAudit();
    assert.ok(before.issues.some((issue) => (
      issue.type === 'unlinked_instructor' && issue.records.offeringId === String(offering._id)
    )));

    const linked = await invoke(assignOfferingInstructor, {
      params: { id: offering._id },
      body: { instructorId: instructor._id },
      user: { role: 'admin' },
    });
    assert.equal(linked.status, 200);
    assert.equal(String(linked.payload.data.instructor), String(instructor._id));
    assert.equal(linked.payload.data.instructorName, 'Mara Reyes');

    const after = await buildAcademicIntegrityAudit();
    assert.equal(after.issues.some((issue) => (
      issue.type === 'unlinked_instructor' && issue.records.offeringId === String(offering._id)
    )), false);
    assert.equal(await AcademicAuditLog.countDocuments({ action: 'assigned_instructor', entityId: String(offering._id) }), 1);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('admin integrity repairs reconnect section, restore reservation, and complete published grade', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const term = await AcademicTerm.create({
      code: 'AY2026-2027-REPAIR',
      name: '1st Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '1',
      status: 'active',
      isActive: true,
    });
    const student = await Student.create({
      _id: 'APP-2026-REPAIR',
      studentId: 'STU-2026-REPAIR',
      firstName: 'Repair',
      lastName: 'Student',
      status: 'enrolled',
      academicTerm: term.name,
    });
    const deletedSection = await Section.create({
      subjectId: 'cs101',
      sectionCode: 'CS-11M1',
      days: 'MWF',
      time: '8:00 AM - 9:30 AM',
      room: '1101',
      maxSlots: 40,
    });
    const offering = await CourseOffering.create({
      term: term._id,
      subjectId: 'cs101',
      subjectCode: 'CS 101',
      subjectName: 'Intro to Computing',
      units: 3,
      sectionKey: 'repair-snapshot',
      sectionCode: deletedSection.sectionCode,
      section: deletedSection._id,
      schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: '1101' },
      instructorName: 'TBA',
      status: 'active',
    });
    await deletedSection.deleteOne();
    const liveSection = await Section.create({
      subjectId: 'cs101',
      sectionCode: 'CS-11A1',
      days: 'TTH',
      time: '1:00 PM - 2:30 PM',
      room: '1102',
      maxSlots: 40,
      enrolledCount: 0,
      enrolledStudentIds: [],
    });
    const membership = await CourseMembership.create({
      student: student._id,
      term: term._id,
      offering: offering._id,
      status: 'enrolled',
      finalGrade: 1.75,
      gradeStatus: 'published',
      gradePublishedAt: new Date(),
    });

    const before = await buildAcademicIntegrityAudit();
    assert.ok(before.issues.some((issue) => issue.type === 'missing_section' && issue.records.offeringId === String(offering._id)));
    assert.ok(before.issues.some((issue) => issue.type === 'published_grade_status_mismatch' && issue.records.membershipId === String(membership._id)));

    const linked = await invoke(linkOfferingSection, {
      params: { id: offering._id },
      body: { sectionId: liveSection._id },
      user: { role: 'admin' },
    });
    assert.equal(linked.status, 200);
    assert.equal(String(linked.payload.data.section), String(liveSection._id));
    assert.deepEqual(linked.payload.data.schedule, offering.schedule);

    const afterLink = await buildAcademicIntegrityAudit();
    assert.ok(afterLink.issues.some((issue) => issue.type === 'membership_missing_reservation' && issue.records.membershipId === String(membership._id)));

    const reservation = await invoke(repairMembershipReservation, {
      params: { id: membership._id },
      body: {},
      user: { role: 'admin' },
    });
    assert.equal(reservation.status, 200);
    const repairedSection = await Section.findById(liveSection._id).select('+enrolledStudentIds');
    assert.equal(repairedSection.enrolledCount, 1);
    assert.deepEqual(repairedSection.enrolledStudentIds.map(String), [student._id]);

    const grade = await invoke(repairDeterministicIntegrityIssues, {
      body: {},
      user: { role: 'admin' },
    });
    assert.equal(grade.status, 200);
    assert.equal(grade.payload.data.repairedPublishedGradeStatuses, 1);
    const repairedMembership = await CourseMembership.findById(membership._id);
    assert.equal(repairedMembership.status, 'completed');
    assert.equal(repairedMembership.gradeStatus, 'published');

    const after = await buildAcademicIntegrityAudit();
    const remainingTypes = after.issues
      .filter((issue) => issue.records?.membershipId === String(membership._id) || issue.records?.offeringId === String(offering._id))
      .map((issue) => issue.type);
    assert.equal(remainingTypes.includes('missing_section'), false);
    assert.equal(remainingTypes.includes('membership_missing_reservation'), false);
    assert.equal(remainingTypes.includes('published_grade_status_mismatch'), false);
    assert.equal(await AcademicAuditLog.countDocuments({
      action: { $in: ['linked_offering_section', 'repaired_membership_reservation', 'repaired_published_grade_status'] },
    }), 3);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('missing active section is reconstructed from offering snapshot with roster intact', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const term = await AcademicTerm.create({
      code: 'AY2026-2027-RECONSTRUCT',
      name: '1st Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '1',
      status: 'active',
      isActive: true,
    });
    const student = await Student.create({
      _id: 'APP-2026-RECONSTRUCT',
      studentId: 'STU-2026-RECONSTRUCT',
      firstName: 'Roster',
      lastName: 'Student',
      status: 'enrolled',
      academicTerm: term.name,
    });
    const deletedSection = await Section.create({
      subjectId: 'cs101',
      sectionCode: 'CS-11A1',
      days: 'M',
      time: '8:00 AM - 9:30 AM',
      room: '1101',
      maxSlots: 40,
    });
    const deletedSectionId = deletedSection._id;
    student.selectedSubjects = [{ subjectId: 'cs101', sectionId: String(deletedSectionId) }];
    await student.save();
    const offering = await CourseOffering.create({
      term: term._id,
      subjectId: 'cs101',
      subjectCode: 'CS 101',
      subjectName: 'Intro to Computing',
      units: 3,
      sectionKey: String(deletedSectionId),
      sectionCode: 'CS-11A1',
      section: deletedSectionId,
      schedule: { day: 'M', time: '8:00 AM - 9:30 AM', room: '1101' },
      instructorName: 'Test Instructor',
      capacity: 40,
      status: 'active',
    });
    await deletedSection.deleteOne();
    await CourseMembership.create({
      student: student._id,
      term: term._id,
      offering: offering._id,
      status: 'enrolled',
    });

    const preview = await previewMissingSectionReconstruction();
    assert.equal(preview.summary.candidates, 1);
    assert.equal(preview.summary.recreateOriginalId, 1);
    assert.equal(preview.summary.activeMemberships, 1);
    const result = await applyMissingSectionReconstruction(preview);
    assert.deepEqual(result, { recreatedSections: 1, relinkedOfferings: 0, restoredReservations: 1 });

    const restored = await Section.findById(deletedSectionId).select('+enrolledStudentIds');
    assert.ok(restored);
    assert.equal(restored.sectionCode, 'CS-11A1');
    assert.equal(restored.enrolledCount, 1);
    assert.deepEqual(restored.enrolledStudentIds.map(String), [student._id]);
    assert.equal(String((await CourseOffering.findById(offering._id)).section), String(deletedSectionId));
    const audit = await buildAcademicIntegrityAudit();
    assert.equal(audit.issues.some((issue) => issue.type === 'missing_section'), false);
    assert.equal(audit.issues.some((issue) => issue.type === 'membership_missing_reservation'), false);

    await CourseMembership.updateOne(
      { student: student._id, offering: offering._id },
      {
        $set: {
          status: 'completed',
          finalGrade: 1.75,
          gradeStatus: 'published',
          gradePublishedAt: new Date(),
          endedAt: new Date(),
        },
      }
    );
    await syncOfficialEnrollment(student, term.name, { activateTerm: false, audit: false });
    const preserved = await CourseMembership.findOne({ student: student._id, offering: offering._id });
    assert.equal(preserved.status, 'completed');
    assert.equal(preserved.gradeStatus, 'published');
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('academic integrity audit detects legacy conflicts without changing records', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const term = await AcademicTerm.create({
      code: 'AY2025-2026-2',
      name: '2nd Semester 2025-2026',
      schoolYear: '2025-2026',
      semester: '2',
      status: 'closed',
      isActive: false,
    });
    const student = await Student.create({
      _id: 'STU-2026-AUDIT',
      studentId: 'STU-2026-AUDIT',
      firstName: 'Audit',
      lastName: 'Student',
      status: 'enrolled',
      academicTerm: '1st Semester 2026-2027',
    });
    const section = await Section.create({
      subjectId: 'cs101',
      sectionCode: 'CS-11M1',
      days: 'MWF',
      time: '8:00 AM - 9:30 AM',
      room: '1101',
      instructor: 'Legacy Instructor',
      maxSlots: 40,
      enrolledCount: 3,
      enrolledStudentIds: [student._id],
    });
    const offeringOne = await CourseOffering.create({
      term: term._id,
      subjectId: 'cs101',
      subjectCode: 'CS 101',
      subjectName: 'Intro to Computing',
      units: 3,
      sectionKey: 'legacy-one',
      sectionCode: section.sectionCode,
      section: section._id,
      schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: '1101' },
      instructorName: 'Legacy Instructor',
      status: 'active',
    });
    const offeringTwo = await CourseOffering.create({
      term: term._id,
      subjectId: 'cs101',
      subjectCode: 'CS 101',
      subjectName: 'Intro to Computing',
      units: 3,
      sectionKey: 'legacy-two',
      sectionCode: section.sectionCode,
      section: section._id,
      schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: '1101' },
      instructorName: 'Legacy Instructor',
      status: 'active',
    });
    await CourseMembership.create([
      { student: student._id, term: term._id, offering: offeringOne._id, status: 'enrolled', source: 'migration' },
      { student: student._id, term: term._id, offering: offeringTwo._id, status: 'enrolled', source: 'migration' },
    ]);

    const before = {
      offerings: await CourseOffering.countDocuments(),
      memberships: await CourseMembership.countDocuments(),
      sectionCount: (await Section.findById(section._id)).enrolledCount,
    };
    const audit = await buildAcademicIntegrityAudit();
    const issueTypes = new Set(audit.issues.map((issue) => issue.type));

    assert.equal(audit.readOnly, true);
    assert.ok(issueTypes.has('duplicate_offering'));
    assert.ok(issueTypes.has('duplicate_membership'));
    assert.ok(issueTypes.has('active_membership_wrong_term'));
    assert.ok(issueTypes.has('student_term_mismatch'));
    assert.ok(issueTypes.has('section_count_drift'));
    assert.ok(issueTypes.has('unlinked_instructor'));
    assert.deepEqual({
      offerings: await CourseOffering.countDocuments(),
      memberships: await CourseMembership.countDocuments(),
      sectionCount: (await Section.findById(section._id)).enrolledCount,
    }, before);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('academic term parser rejects reversed or nonconsecutive school years', () => {
  assert.equal(parseAcademicTermLabel('2nd Semester 2026-2027').name, '2nd Semester 2026-2027');
  assert.throws(() => parseAcademicTermLabel('2nd Semester 2028-2027'), /consecutive years/);
  assert.throws(() => parseAcademicTermLabel('1st Semester 2026-2028'), /consecutive years/);
  assert.throws(() => parseAcademicTermLabel('Semester 1 2026-2027'), /must use format/);
});

test('legacy stored term is repaired without weakening new-input validation', () => {
  assert.equal(
    repairStoredAcademicTermLabel('1st Semester'),
    '1st Semester 2026-2027'
  );
  assert.equal(
    repairStoredAcademicTermLabel('2nd Semester'),
    '2nd Semester 2026-2027'
  );
  assert.equal(
    repairStoredAcademicTermLabel('2nd Semester 2028-2027'),
    '1st Semester 2026-2027'
  );
});

test('concurrent schedule submissions cannot overbook one remaining slot', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const section = await Section.create({
      subjectId: 'cs101',
      sectionCode: 'CS 101-A',
      days: 'MWF',
      time: '8:00 AM - 9:30 AM',
      room: '301',
      instructor: 'Test Instructor',
      maxSlots: 1,
    });
    const students = await Student.create([
      {
        _id: 'APP-2026-9101',
        status: 'advising_approved',
        selectedSubjects: [{ subjectId: 'cs101', sectionId: String(section._id) }],
      },
      {
        _id: 'APP-2026-9102',
        status: 'advising_approved',
        selectedSubjects: [{ subjectId: 'cs101', sectionId: String(section._id) }],
      },
    ]);

    const results = await Promise.all(students.map((student) => invoke(submitSchedule, {
      params: { studentId: student._id },
      body: {},
    })));
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
    assert.equal((await Section.findById(section._id)).enrolledCount, 1);
    assert.equal(await Student.countDocuments({ scheduleStatus: 'finalized' }), 1);
    assert.equal(await Student.countDocuments({ scheduleStatus: 'draft' }), 1);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('applicant token permits only its own student record', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-student-access-secret';

  const invokeAccess = (studentId, token) => new Promise((resolve, reject) => {
    const req = { headers: { authorization: `Bearer ${token}` }, params: { id: studentId }, body: {} };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); },
    };
    protectStudentRecord(req, res, (error) => error ? reject(error) : resolve({ status: 200 }));
  });

  try {
    await Student.create([
      { _id: 'APP-2026-9201', status: 'registration' },
      { _id: 'APP-2026-9202', status: 'registration' },
    ]);
    const token = generateApplicantToken('APP-2026-9201');
    assert.equal((await invokeAccess('APP-2026-9201', token)).status, 200);
    assert.equal((await invokeAccess('APP-2026-9202', token)).status, 403);
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('student account follows explicit profile link and cannot access another record', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-student-access-secret';

  const invokeAccess = (studentId, token) => new Promise((resolve, reject) => {
    const req = { headers: { authorization: `Bearer ${token}` }, params: { id: studentId }, body: {} };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); },
    };
    protectStudentRecord(req, res, (error) => error ? reject(error) : resolve({ status: 200, req }));
  });

  try {
    await Student.create([
      { _id: 'APP-2026-9301', studentId: 'STU-2026-9301', schoolEmail: 'linked@ncst.edu', status: 'enrolled' },
      { _id: 'APP-2026-9302', studentId: 'STU-2026-9302', schoolEmail: 'other@ncst.edu', status: 'enrolled' },
    ]);
    const user = await User.create({
      username: 'LEGACY-ACCOUNT-ID',
      email: 'linked@ncst.edu',
      password: 'password123',
      firstName: 'Linked',
      lastName: 'Student',
      role: 'student',
      studentProfile: 'APP-2026-9301',
    });
    const token = jwt.sign({ user: { id: user._id, role: 'student' } }, process.env.JWT_SECRET);

    assert.equal((await invokeAccess('APP-2026-9301', token)).status, 200);
    assert.equal((await invokeAccess('STU-2026-9301', token)).status, 200);
    assert.equal((await invokeAccess('STU-2026-9302', token)).status, 403);
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('legacy student account repairs one unique email profile link', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-student-access-secret';

  try {
    await Student.create({
      _id: 'APP-2026-9401',
      studentId: 'STU-2026-9401',
      schoolEmail: 'legacy@ncst.edu',
      status: 'enrolled',
    });
    const user = await User.create({
      username: 'STALE-STUDENT-ID',
      email: 'legacy@ncst.edu',
      password: 'password123',
      firstName: 'Legacy',
      lastName: 'Student',
      role: 'student',
    });
    const token = jwt.sign({ user: { id: user._id, role: 'student' } }, process.env.JWT_SECRET);
    const result = await new Promise((resolve, reject) => {
      const req = { headers: { authorization: `Bearer ${token}` }, params: { id: 'STU-2026-9401' }, body: {} };
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(payload) { resolve({ status: this.statusCode, payload }); },
      };
      protectStudentRecord(req, res, (error) => error ? reject(error) : resolve({ status: 200 }));
    });

    assert.equal(result.status, 200);
    assert.equal((await User.findById(user._id)).studentProfile, 'APP-2026-9401');
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    await mongoose.disconnect();
    await mongo.stop();
  }
});
