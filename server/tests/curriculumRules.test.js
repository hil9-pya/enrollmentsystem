import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { validateSectionCode } from '../adminSchedulerController.js';
import { addSchedulerSection, submitSchedule } from '../schedulerController.js';
import Student from '../Student.js';
import Settings from '../Settings.js';
import Section from '../models/Section.js';
import { selectProgram } from '../studentsController.js';
import {
  getCurriculumSubjects,
  getPassedSubjectIds,
  getStudyPlanSubjectsForStudent,
  getSemesterNumber,
  validateStudentSubjectEligibility,
} from '../services/schedulerService.js';

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

test('curriculum selection stays within program, year, and semester', () => {
  const subjects = getCurriculumSubjects('bscs', 1, 1);
  assert.ok(subjects.some((subject) => subject.id === 'cs101'));
  assert.equal(subjects.some((subject) => subject.id === 'cs201'), false);
  assert.equal(subjects.some((subject) => subject.id === 'ba101'), false);

  const secondSemester = getCurriculumSubjects('bscs', 1, 2);
  assert.ok(secondSemester.some((subject) => subject.id === 'cs103'));
  assert.ok(secondSemester.some((subject) => subject.id === 'cs104'));
  assert.equal(secondSemester.some((subject) => subject.id === 'cs101'), false);
  for (const programId of ['bscs', 'bsba', 'bsn']) {
    assert.ok(getCurriculumSubjects(programId, 1, 2)
      .some((subject) => subject.programId === programId && subject.semester === 2));
  }
});

test('student subject eligibility enforces program, year, completion, and approval', () => {
  const freshman = {
    enrollmentType: 'new',
    programId: 'bscs',
    yearLevel: 1,
    academicTerm: '1st Semester 2026-2027',
    academicRecord: [],
    approvedSubjectIds: ['cs101', 'cs102'],
  };
  assert.equal(validateStudentSubjectEligibility(freshman, 'cs101').valid, true);
  assert.match(validateStudentSubjectEligibility(freshman, 'ba101').error, /degree program/i);
  assert.match(validateStudentSubjectEligibility(freshman, 'cs201').error, /prerequisites/i);

  const continuing = {
    enrollmentType: 'continuing',
    programId: 'bscs',
    yearLevel: 2,
    academicTerm: '1st Semester 2026-2027',
    academicRecord: [{ subjectId: 'cs102', grade: 2, term: '1st Semester 2025-2026' }],
    approvedSubjectIds: ['cs201'],
  };
  assert.equal(validateStudentSubjectEligibility(continuing, 'cs201').valid, true);
  assert.match(validateStudentSubjectEligibility(continuing, 'cs202').error, /approved study plan/i);

  const completed = { ...freshman, academicRecord: [{ subjectId: 'cs101', grade: 1.75, term: 'prior' }] };
  assert.match(validateStudentSubjectEligibility(completed, 'cs101').error, /already completed/i);
});

test('continuing first-year student receives only approved second-semester subjects', () => {
  const student = {
    enrollmentType: 'continuing',
    programId: 'bscs',
    yearLevel: 1,
    academicTerm: '2nd Semester 2026-2027',
    academicRecord: [
      { subjectId: 'cs101', grade: 2, term: '1st Semester 2026-2027' },
      { subjectId: 'cs102', grade: 2, term: '1st Semester 2026-2027' },
    ],
    approvedSubjectIds: ['cs103', 'cs104'],
  };
  assert.deepEqual(
    getStudyPlanSubjectsForStudent(student).map((subject) => subject.id).sort(),
    ['cs103', 'cs104']
  );
});

test('program selection uses configured full academic term instead of client fallback', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    await Settings.create({ activeTerm: '1st Semester 2026-2027' });
    const student = await Student.create({
      _id: 'APP-TERM-SELECTION-0001',
      status: 'documents_approved',
      enrollmentType: 'new',
    });

    const result = await invoke(selectProgram, {
      params: { id: student._id },
      body: { programId: 'bscs', academicTerm: '1st Semester' },
    });
    assert.equal(result.status, 200);
    assert.equal(result.payload.academicTerm, '1st Semester 2026-2027');
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('academic grade and semester helpers reject incomplete grades', () => {
  assert.deepEqual(getPassedSubjectIds([
    { subjectId: 'cs101', grade: 2 },
    { subjectId: 'cs102', grade: null },
    { subjectId: 'cs201', grade: 5 },
  ]), ['cs101']);
  assert.equal(getSemesterNumber('2nd Semester 2026-2027'), 2);
  assert.equal(getSemesterNumber('2s-2026'), 2);
  assert.equal(getSemesterNumber('1st Semester 2026-2027'), 1);
});

test('section codes support fourth year and second semester', () => {
  const subject = { programId: 'bscs', yearLevel: 4, semester: 2 };
  assert.equal(validateSectionCode('CS-42M1', subject), null);
  assert.match(validateSectionCode('CS-41M1', subject), /semester 2/i);
  assert.match(validateSectionCode('BA-42M1', subject), /must use CS/i);
  assert.equal(validateSectionCode('GE-12A3', { programId: 'elective', yearLevel: null, semester: null }), null);
});

test('add-section endpoint rejects out-of-program subject without changing schedule', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const section = await Section.create({
      subjectId: 'ba101',
      sectionCode: 'BA-11M1',
      days: 'MWF',
      time: '8:00 AM - 9:30 AM',
      maxSlots: 40,
    });
    const student = await Student.create({
      _id: 'APP-CURRICULUM-0001',
      status: 'advising_approved',
      enrollmentType: 'new',
      programId: 'bscs',
      yearLevel: 1,
      academicTerm: '1st Semester 2026-2027',
      approvedSubjectIds: ['cs101'],
    });

    const result = await invoke(addSchedulerSection, {
      params: { studentId: student._id },
      body: { subjectId: 'ba101', sectionId: String(section._id) },
    });
    assert.equal(result.status, 403);
    assert.match(result.payload.message, /degree program/i);
    assert.equal((await Student.findById(student._id)).selectedSubjects.length, 0);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});

test('schedule finalization requires every adviser-approved subject', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const section = await Section.create({
      subjectId: 'cs201',
      sectionCode: 'CS-21M1',
      days: 'MWF',
      time: '10:00 AM - 11:30 AM',
      maxSlots: 40,
    });
    const student = await Student.create({
      _id: 'APP-CURRICULUM-0002',
      status: 'advising_approved',
      enrollmentType: 'continuing',
      programId: 'bscs',
      yearLevel: 2,
      academicTerm: '1st Semester 2026-2027',
      academicRecord: [{ subjectId: 'cs102', grade: 2, term: '1st Semester 2025-2026' }],
      approvedSubjectIds: ['cs201', 'cs202'],
      selectedSubjects: [{ subjectId: 'cs201', sectionId: String(section._id) }],
    });

    const result = await invoke(submitSchedule, { params: { studentId: student._id }, body: {} });
    assert.equal(result.status, 409);
    assert.match(result.payload.message, /CS 202/);
    assert.equal((await Student.findById(student._id)).scheduleStatus, 'draft');
    assert.equal((await Section.findById(section._id)).enrolledCount, 0);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
