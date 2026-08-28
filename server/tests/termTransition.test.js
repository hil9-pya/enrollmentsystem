import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Settings from '../Settings.js';
import Student from '../Student.js';
import AcademicTerm from '../models/AcademicTerm.js';
import CourseOffering from '../models/CourseOffering.js';
import CourseMembership from '../models/CourseMembership.js';
import { rolloverStudent } from '../studentsController.js';
import {
  advanceAcademicTerm,
  buildTermTransitionPreview,
} from '../services/termTransitionService.js';
import {
  batchRolloverToActiveTerm,
  buildTermClosingQueue,
} from '../services/continuingRolloverService.js';
import { repairLegacyEnrolledStudentTerms } from '../services/academicFoundationService.js';

function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    handler(req, res, reject);
  });
}

async function createOffering(term, suffix = '1') {
  return CourseOffering.create({
    term: term._id,
    subjectId: `cs10${suffix}`,
    subjectCode: `CS 10${suffix}`,
    subjectName: `Subject ${suffix}`,
    units: 3,
    sectionKey: `section-${suffix}`,
    sectionCode: `CS-11M${suffix}`,
    status: 'active',
  });
}

test('term transition blocks unfinished classes and safely processes institutional students', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const oldTerm = '2nd Semester 2026-2027';
    await Settings.create({ activeTerm: oldTerm });
    const term = await AcademicTerm.create({
      code: '2ND-SEMESTER-2026-2027',
      name: oldTerm,
      schoolYear: '2026-2027',
      semester: '2',
      status: 'active',
      isActive: true,
    });
    const offering = await createOffering(term);
    const continuing = await Student.create({
      _id: 'APP-TRANSITION-0001',
      studentId: 'STU-2026-0001',
      firstName: 'Current',
      lastName: 'Student',
      status: 'enrolled',
      academicTerm: oldTerm,
      missedSemesters: 1,
    });
    const membership = await CourseMembership.create({
      student: continuing._id,
      term: term._id,
      offering: offering._id,
      status: 'enrolled',
      gradeStatus: 'approved',
      finalGrade: 1.75,
    });
    const inactive = await Student.create({
      _id: 'APP-TRANSITION-0002',
      studentId: 'STU-2026-0002',
      status: 'registration',
      missedSemesters: 0,
    });
    const archiveRisk = await Student.create({
      _id: 'APP-TRANSITION-0003',
      studentId: 'STU-2026-0003',
      status: 'registration',
      missedSemesters: 1,
    });
    const applicant = await Student.create({
      _id: 'APP-TRANSITION-0004',
      status: 'registration',
      missedSemesters: 0,
    });

    const blocked = await buildTermTransitionPreview();
    assert.equal(blocked.canAdvance, false);
    assert.equal(blocked.counts.unresolvedClasses, 1);
    await assert.rejects(
      () => advanceAcademicTerm(oldTerm, 'admin'),
      /must be completed, dropped, or withdrawn/
    );

    membership.status = 'completed';
    membership.gradeStatus = 'published';
    await membership.save();

    const result = await advanceAcademicTerm(oldTerm, 'admin');
    assert.equal(result.newTerm, '1st Semester 2027-2028');
    assert.equal((await Settings.findOne()).activeTerm, result.newTerm);

    const refreshedContinuing = await Student.findById(continuing._id);
    assert.equal(refreshedContinuing.lastEnrolledTerm, oldTerm);
    assert.equal(refreshedContinuing.missedSemesters, 0);
    assert.equal((await Student.findById(inactive._id)).missedSemesters, 1);
    assert.equal((await Student.findById(archiveRisk._id)).isDeleted, true);
    assert.equal((await Student.findById(applicant._id)).missedSemesters, 0);
    await assert.rejects(
      () => advanceAcademicTerm(oldTerm, 'admin'),
      /changed|already advanced/
    );
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('continuing rollover clears prior-term enrollment state and advances year after second semester', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    await Settings.create({ activeTerm: '1st Semester 2027-2028' });
    await AcademicTerm.create({
      code: '2ND-SEMESTER-2026-2027',
      name: '2nd Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '2',
      status: 'closed',
      isActive: false,
    });
    const student = await Student.create({
      _id: 'APP-ROLLOVER-0001',
      studentId: 'STU-2026-0100',
      firstName: 'Continuing',
      lastName: 'Student',
      status: 'enrolled',
      enrollmentType: 'new',
      academicTerm: '2nd Semester 2026-2027',
      yearLevel: 1,
      selectedSubjects: [{ subjectId: 'cs101', sectionId: new mongoose.Types.ObjectId() }],
      approvedSubjectIds: ['cs101'],
      totalTuition: 25000,
      tuitionBreakdown: [{ label: 'Tuition', amount: 25000 }],
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      amountPaid: 25000,
      paymentReference: 'OLD-PAYMENT',
      receiptNumber: 'OR-OLD',
      receiptGenerated: true,
      scheduleGenerated: true,
      registrationFormGenerated: true,
    });

    const response = await invoke(rolloverStudent, {
      params: { id: student._id },
      user: { username: 'registrar' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.payload.status, 'advising_pending');
    assert.equal(response.payload.enrollmentType, 'continuing');
    assert.equal(response.payload.academicTerm, '1st Semester 2027-2028');
    assert.equal(response.payload.lastEnrolledTerm, '2nd Semester 2026-2027');
    assert.equal(response.payload.yearLevel, 2);
    assert.deepEqual(response.payload.approvedSubjectIds, []);
    assert.deepEqual(response.payload.selectedSubjects, []);
    assert.equal(response.payload.paymentStatus, 'unpaid');
    assert.equal(response.payload.amountPaid, 0);
    assert.equal(response.payload.paymentReference, null);
    assert.equal(response.payload.receiptNumber, null);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('legacy semester-only student term is repaired from official history before rollover', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    await Settings.create({ activeTerm: '2nd Semester 2026-2027' });
    const previousTerm = await AcademicTerm.create({
      code: '1ST-SEMESTER-2026-2027',
      name: '1st Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '1',
      status: 'closed',
      isActive: false,
    });
    await AcademicTerm.create({
      code: '2ND-SEMESTER-2026-2027',
      name: '2nd Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '2',
      status: 'active',
      isActive: true,
    });
    const offering = await createOffering(previousTerm, '1');
    const student = await Student.create({
      _id: 'APP-LEGACY-TERM-0001',
      studentId: 'STU-2026-0001',
      firstName: 'Legacy',
      lastName: 'Term',
      status: 'enrolled',
      programId: 'bscs',
      academicTerm: '1st Semester',
      academicRecord: [{ subjectId: 'cs101', grade: 2, term: '1st Semester 2026-2027' }],
    });
    await CourseMembership.create({
      student: student._id,
      term: previousTerm._id,
      offering: offering._id,
      status: 'completed',
      gradeStatus: 'published',
      finalGrade: 2,
    });

    assert.equal(await repairLegacyEnrolledStudentTerms('2nd Semester 2026-2027'), 1);
    assert.equal((await Student.findById(student._id)).academicTerm, '1st Semester 2026-2027');

    const queue = await buildTermClosingQueue();
    const row = queue.rollover.students.find((item) => item.id === student._id);
    assert.equal(row.eligible, true);
    assert.equal(row.previousTerm, '1st Semester 2026-2027');
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('term-closing queue reports blockers and batch rollover returns per-student results', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const activeTermLabel = '2nd Semester 2026-2027';
    await Settings.create({ activeTerm: activeTermLabel });
    await AcademicTerm.create({
      code: '2ND-SEMESTER-2026-2027',
      name: activeTermLabel,
      schoolYear: '2026-2027',
      semester: '2',
      status: 'active',
      isActive: true,
    });
    const previousTerm = await AcademicTerm.create({
      code: '1ST-SEMESTER-2026-2027',
      name: '1st Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '1',
      status: 'closed',
      isActive: false,
    });
    const previousOffering = await createOffering(previousTerm, '2');
    const eligible = await Student.create({
      _id: 'APP-BATCH-0001',
      studentId: 'STU-2026-0201',
      firstName: 'Eligible',
      lastName: 'Student',
      status: 'enrolled',
      academicTerm: previousTerm.name,
      yearLevel: 1,
      paymentStatus: 'paid',
    });
    const blocked = await Student.create({
      _id: 'APP-BATCH-0002',
      studentId: 'STU-2026-0202',
      firstName: 'Blocked',
      lastName: 'Student',
      status: 'enrolled',
      academicTerm: previousTerm.name,
      yearLevel: 1,
      paymentStatus: 'paid',
    });
    const returningReview = await Student.create({
      _id: 'APP-BATCH-0003',
      studentId: 'STU-2026-0203',
      firstName: 'Returning',
      lastName: 'Review',
      status: 'enrolled',
      academicTerm: previousTerm.name,
      yearLevel: 1,
      missedSemesters: 1,
    });
    await CourseMembership.create({
      student: blocked._id,
      term: previousTerm._id,
      offering: previousOffering._id,
      status: 'enrolled',
      gradeStatus: 'not_submitted',
    });

    const queue = await buildTermClosingQueue();
    assert.equal(queue.rollover.total, 3);
    assert.equal(queue.rollover.eligible, 1);
    assert.equal(queue.rollover.blocked, 2);
    assert.match(queue.rollover.students.find((row) => row.id === blocked._id).reason, /still active/);
    assert.match(queue.rollover.students.find((row) => row.id === returningReview._id).reason, /returning-student review/);

    const result = await batchRolloverToActiveTerm(
      [eligible._id, blocked._id],
      { expectedActiveTerm: activeTermLabel, actor: 'registrar' }
    );
    assert.equal(result.successful.length, 1);
    assert.equal(result.failed.length, 1);
    assert.match(result.failed[0].reason, /published final grades|drop\/withdrawal/);

    const refreshedEligible = await Student.findById(eligible._id);
    const refreshedBlocked = await Student.findById(blocked._id);
    assert.equal(refreshedEligible.academicTerm, activeTermLabel);
    assert.equal(refreshedEligible.status, 'advising_pending');
    assert.equal(refreshedEligible.paymentStatus, 'unpaid');
    assert.equal(refreshedBlocked.academicTerm, previousTerm.name);
    assert.equal(refreshedBlocked.status, 'enrolled');

    await assert.rejects(
      () => batchRolloverToActiveTerm([blocked._id], {
        expectedActiveTerm: '1st Semester 2026-2027',
        actor: 'registrar',
      }),
      /changed/
    );
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
