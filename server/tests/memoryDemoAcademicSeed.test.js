import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import Student from '../Student.js';
import User from '../User.js';
import { seedUsers } from '../seed.js';
import { initCatalog, SUBJECTS_CATALOG } from '../subjectsCatalog.js';
import { validateSectionCode } from '../adminSchedulerController.js';
import { getResolvedEnrolledSchedule, validateAddSection, validateSectionConflict } from '../services/schedulerService.js';
import { seedMemoryDemoAcademicData } from '../services/memoryDemoAcademicSeedService.js';

test('memory demo seed adds valid instructors and scheduled sections without touching normal databases', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    await seedUsers({ includeStudentAccounts: false });
    assert.equal(await User.countDocuments({ role: 'student' }), 0);
    await Subject.create({
      id: 'cs101',
      code: 'CS 101',
      name: 'Existing Admin-Managed Intro',
      units: 3,
      programId: 'bscs',
      fee: 4500,
      yearLevel: 1,
      semester: 1,
    });
    await initCatalog();
    assert.equal(await Subject.countDocuments(), 38);
    assert.equal((await Subject.findOne({ id: 'cs101' })).name, 'Existing Admin-Managed Intro');
    const legacyStudent = await Student.create({
      _id: 'APP-MEMORY-SEED-0001',
      studentId: 'STU-MEMORY-SEED-0001',
      selectedSubjects: [
        { subjectId: 'cs101', sectionId: 'cs101-a' },
        { subjectId: 'cs102', sectionId: 'cs102-b' },
      ],
    });

    const skipped = await seedMemoryDemoAcademicData();
    assert.equal(skipped.skipped, true);
    assert.equal(await Section.countDocuments(), 0);

    const firstRun = await seedMemoryDemoAcademicData({ memoryDatabase: true });
    assert.equal(firstRun.skipped, false);
    assert.equal(firstRun.applicants, 6);
    assert.equal(firstRun.studentAccounts, 6);
    assert.equal(firstRun.instructors, 11);
    assert.equal(firstRun.sections, SUBJECTS_CATALOG.length * 2);
    assert.equal(firstRun.remappedSelections, 2);

    const instructors = await User.find({ role: 'instructor' });
    const sections = await Section.find({}).populate('instructorUser');
    assert.equal(instructors.length, 12);
    assert.equal(sections.length, SUBJECTS_CATALOG.length * 2);

    const applicants = await Student.find({ _id: { $regex: '^APP-2026-10' } });
    assert.equal(applicants.length, 6);
    assert.equal(applicants.filter((applicant) => applicant.enrollmentType === 'new').length, 3);
    assert.equal(applicants.filter((applicant) => applicant.enrollmentType === 'transfer').length, 3);
    assert.ok(applicants.filter((applicant) => applicant.enrollmentType === 'new')
      .every((applicant) => applicant.status === 'advising_approved'));
    assert.ok(applicants.filter((applicant) => applicant.enrollmentType === 'transfer')
      .every((applicant) => applicant.status === 'advising_pending'));
    assert.ok(applicants.every((applicant) => (
      applicant.emailVerified
      && applicant.acceptanceLetterSeen
      && applicant.schoolEmail
      && applicant.documents.length === (applicant.enrollmentType === 'new' ? 3 : 5)
      && applicant.documents.every((document) => document.status === 'approved')
    )));
    assert.ok(await applicants[0].compareApplicantPassword('password123'));
    const approvedStudentAccounts = await User.find({ role: 'student' });
    assert.equal(approvedStudentAccounts.length, 6);
    assert.ok(approvedStudentAccounts.every((account) => account.username.startsWith('APP-2026-10')));
    assert.ok(await approvedStudentAccounts[0].comparePassword('NCST2026!'));
    assert.equal(await User.countDocuments({ role: 'student', username: { $regex: '^STU-' } }), 0);
    assert.equal(await Student.countDocuments({ _id: { $regex: '^STU-' } }), 0);

    for (const subject of SUBJECTS_CATALOG) {
      const subjectSections = sections.filter((section) => section.subjectId === subject.id);
      assert.equal(subjectSections.length, 2);
      for (const section of subjectSections) {
        assert.equal(validateSectionCode(section.sectionCode, subject), null);
        assert.equal(section.instructorUser.role, 'instructor');
        assert.notEqual(section.days, 'TBA');
        assert.notEqual(section.time, 'TBA');
        assert.ok(section.room);
        const conflictCheck = await validateSectionConflict(section.toObject(), section._id);
        assert.deepEqual(conflictCheck, { valid: true });
      }
    }

    const coreCohorts = new Map();
    for (const subject of SUBJECTS_CATALOG.filter((entry) => entry.programId !== 'elective')) {
      const cohortKey = `${subject.programId}:${subject.yearLevel}:${subject.semester}`;
      if (!coreCohorts.has(cohortKey)) coreCohorts.set(cohortKey, []);
      coreCohorts.get(cohortKey).push(subject);
    }
    for (const cohortSubjects of coreCohorts.values()) {
      const currentSections = [];
      for (const subject of cohortSubjects) {
        const section = sections.find((entry) => (
          entry.subjectId === subject.id && entry.sectionCode.includes('M1')
        ));
        const result = await validateAddSection(
          currentSections,
          subject.id,
          section._id.toString(),
          currentSections.length * 3
        );
        assert.deepEqual(result, { valid: true });
        currentSections.push({ subjectId: subject.id, sectionId: section._id.toString() });
      }
    }

    const refreshedStudent = await Student.findById(legacyStudent._id);
    assert.ok(refreshedStudent.selectedSubjects.every((selection) => mongoose.isValidObjectId(selection.sectionId)));
    const resolvedSchedule = await getResolvedEnrolledSchedule(refreshedStudent.selectedSubjects);
    assert.equal(resolvedSchedule.length, 2);
    assert.ok(resolvedSchedule.every((row) => row.instructor !== 'TBA' && row.schedule.room !== 'TBA'));

    const secondRun = await seedMemoryDemoAcademicData({ memoryDatabase: true });
    assert.equal(secondRun.remappedSelections, 0);
    assert.equal(await User.countDocuments({ role: 'instructor' }), 12);
    assert.equal(await User.countDocuments({ role: 'student' }), 6);
    assert.equal(await Student.countDocuments({ _id: { $regex: '^APP-2026-10' } }), 6);
    assert.equal(await Section.countDocuments(), SUBJECTS_CATALOG.length * 2);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
