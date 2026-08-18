import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../User.js';
import Student from '../Student.js';
import AcademicTerm from '../models/AcademicTerm.js';
import CourseOffering from '../models/CourseOffering.js';
import CourseMembership from '../models/CourseMembership.js';
import LmsAnnouncement from '../models/LmsAnnouncement.js';
import {
  createAnnouncement,
  getLmsClass,
  listAnnouncements,
  setOfferingLmsStatus,
} from '../lmsController.js';

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

test('LMS class access follows official membership and assigned instructor', async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  try {
    const [instructor, otherInstructor, admin, studentUser] = await User.create([
      { username: 'lms-instructor', email: 'lms-instructor@test.local', password: 'password123', firstName: 'Lina', lastName: 'Santos', role: 'instructor' },
      { username: 'other-instructor', email: 'other-instructor@test.local', password: 'password123', firstName: 'Other', lastName: 'Faculty', role: 'instructor' },
      { username: 'lms-admin', email: 'lms-admin@test.local', password: 'password123', firstName: 'Admin', lastName: 'User', role: 'admin' },
      { username: 'STU-2026-LMS', email: 'lms-student@test.local', password: 'password123', firstName: 'Lms', lastName: 'Student', role: 'student', studentProfile: 'APP-2026-LMS' },
    ]);
    const term = await AcademicTerm.create({
      code: 'AY2026-2027-LMS',
      name: '1st Semester 2026-2027',
      schoolYear: '2026-2027',
      semester: '1',
      status: 'active',
      isActive: true,
    });
    const student = await Student.create({
      _id: 'APP-2026-LMS',
      studentId: 'STU-2026-LMS',
      firstName: 'Lms',
      lastName: 'Student',
      schoolEmail: 'lms-student@test.local',
      status: 'enrolled',
      academicTerm: term.name,
    });
    const offering = await CourseOffering.create({
      term: term._id,
      subjectId: 'cs101',
      subjectCode: 'CS 101',
      subjectName: 'Intro to Computing',
      units: 3,
      sectionKey: 'lms-test-section',
      sectionCode: 'CS-11A1',
      schedule: { day: 'M', time: '8:00 AM - 9:30 AM', room: '1101' },
      instructorName: 'Lina Santos',
      instructor: instructor._id,
      capacity: 40,
      status: 'active',
      lmsEnabled: true,
    });
    await CourseMembership.create({
      student: student._id,
      studentUser: studentUser._id,
      term: term._id,
      offering: offering._id,
      status: 'enrolled',
    });

    const studentView = await invoke(getLmsClass, {
      params: { offeringId: offering._id },
      user: studentUser,
    });
    assert.equal(studentView.status, 200);
    assert.equal(studentView.payload.data.canManage, false);
    assert.equal(studentView.payload.data.rosterCount, 1);

    const created = await invoke(createAnnouncement, {
      params: { offeringId: offering._id },
      body: { title: 'Welcome', body: 'Read the first module.', isPinned: true },
      user: instructor,
    });
    assert.equal(created.status, 201);
    assert.equal(created.payload.data.title, 'Welcome');

    const studentAnnouncements = await invoke(listAnnouncements, {
      params: { offeringId: offering._id },
      user: studentUser,
    });
    assert.equal(studentAnnouncements.status, 200);
    assert.equal(studentAnnouncements.payload.data.length, 1);

    const blockedInstructor = await invoke(createAnnouncement, {
      params: { offeringId: offering._id },
      body: { title: 'Wrong class', body: 'Must not publish.' },
      user: otherInstructor,
    });
    assert.equal(blockedInstructor.status, 403);
    assert.equal(await LmsAnnouncement.countDocuments({ offering: offering._id }), 1);

    const disabled = await invoke(setOfferingLmsStatus, {
      params: { offeringId: offering._id },
      body: { enabled: false },
      user: admin,
    });
    assert.equal(disabled.status, 200);
    assert.equal(disabled.payload.data.lmsEnabled, false);

    const blockedStudent = await invoke(getLmsClass, {
      params: { offeringId: offering._id },
      user: studentUser,
    });
    assert.equal(blockedStudent.status, 403);

    const instructorPreview = await invoke(getLmsClass, {
      params: { offeringId: offering._id },
      user: instructor,
    });
    assert.equal(instructorPreview.status, 200);
    assert.equal(instructorPreview.payload.data.offering.lmsEnabled, false);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
