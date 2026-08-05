import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Student from '../Student.js';
import User from '../User.js';
import Section from '../models/Section.js';
import CourseMembership from '../models/CourseMembership.js';
import { submitSchedule } from '../schedulerController.js';
import { syncOfficialEnrollment } from '../services/academicFoundationService.js';
import { publishFinalGrade, reviewFinalGrade, submitFinalGrade } from '../academicController.js';

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
    await User.create({
      username: 'STU-2026-9999',
      email: 'student@test.local',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Student',
      role: 'student',
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
      selectedSubjects: [{ subjectId: 'cs101', sectionId: String(section._id) }],
    });

    await invoke(submitSchedule, { params: { studentId: student._id }, body: {} });
    await invoke(submitSchedule, { params: { studentId: student._id }, body: {} });
    assert.equal((await Section.findById(section._id)).enrolledCount, 1);

    student = await Student.findById(student._id);
    student.status = 'enrolled';
    student.enrolledAt = new Date();
    await student.save();
    await syncOfficialEnrollment(student, '1st Semester 2026-2027', { actor: registrar });

    let membership = await CourseMembership.findOne({ student: student._id }).populate('offering');
    assert.ok(membership);
    assert.equal(String(membership.offering.instructor), String(instructor._id));

    await invoke(submitFinalGrade, {
      params: { id: membership._id },
      body: { grade: 1.75 },
      user: instructor,
    });
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
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
