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
import LmsAssignment from '../models/LmsAssignment.js';
import LmsSubmission from '../models/LmsSubmission.js';
import LmsNotification from '../models/LmsNotification.js';
import {
  authorizeSubmissionUpload,
  createAssignment,
  createAnnouncement,
  getLmsDashboard,
  getLmsClass,
  getOfferingGradebook,
  gradeSubmission,
  listAssignments,
  listAnnouncements,
  listLmsNotifications,
  markAllLmsNotificationsRead,
  markLmsNotificationRead,
  setOfferingLmsStatus,
  submitAssignment,
  returnSubmission,
  updateAssignment,
  deleteAssignment,
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

function invokeMiddleware(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ continued: false, status: this.statusCode, payload, req });
        return this;
      },
    };
    handler(req, res, (error) => {
      if (error) reject(error);
      else resolve({ continued: true, req });
    });
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

    const firstStudentNotifications = await invoke(listLmsNotifications, { user: studentUser });
    assert.equal(firstStudentNotifications.status, 200);
    assert.equal(firstStudentNotifications.payload.unreadCount, 1);
    assert.equal(firstStudentNotifications.payload.data[0].type, 'announcement');

    const blockedNotificationRead = await invoke(markLmsNotificationRead, {
      params: { id: firstStudentNotifications.payload.data[0]._id },
      user: otherInstructor,
    });
    assert.equal(blockedNotificationRead.status, 404);

    const studentAnnouncements = await invoke(listAnnouncements, {
      params: { offeringId: offering._id },
      user: studentUser,
    });
    assert.equal(studentAnnouncements.status, 200);
    assert.equal(studentAnnouncements.payload.data.length, 1);

    const assignmentResult = await invoke(createAssignment, {
      params: { offeringId: offering._id },
      body: {
        title: 'Module 1 exercise',
        instructions: 'Submit a short response.',
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
        points: 20,
        allowLateSubmissions: false,
      },
      user: instructor,
    });
    assert.equal(assignmentResult.status, 201);
    assert.equal(assignmentResult.payload.data.points, 20);
    assert.equal(await LmsNotification.countDocuments({ targetUser: studentUser._id, readAt: null }), 2);

    const studentDeadlineNotifications = await invoke(listLmsNotifications, { user: studentUser });
    assert.equal(studentDeadlineNotifications.status, 200);
    assert.equal(studentDeadlineNotifications.payload.unreadCount, 3);
    assert.equal(studentDeadlineNotifications.payload.data.some((item) => item.sourceId === `deadline:${assignmentResult.payload.data._id}`), true);
    await invoke(listLmsNotifications, { user: studentUser });
    assert.equal(await LmsNotification.countDocuments({ targetUser: studentUser._id, sourceId: `deadline:${assignmentResult.payload.data._id}` }), 1);

    const studentDashboardBeforeSubmission = await invoke(getLmsDashboard, { user: studentUser });
    assert.equal(studentDashboardBeforeSubmission.status, 200);
    assert.equal(studentDashboardBeforeSubmission.payload.data.counts.classes, 1);
    assert.equal(studentDashboardBeforeSubmission.payload.data.counts.upcoming, 1);

    const studentAssignments = await invoke(listAssignments, {
      params: { offeringId: offering._id },
      user: studentUser,
    });
    assert.equal(studentAssignments.status, 200);
    assert.equal(studentAssignments.payload.data.length, 1);
    assert.equal(studentAssignments.payload.data[0].submission, null);

    const submissionRequest = {
      params: { assignmentId: assignmentResult.payload.data._id },
      body: { text: 'My module response.' },
      user: studentUser,
    };
    const authorizedSubmission = await invokeMiddleware(authorizeSubmissionUpload, submissionRequest);
    assert.equal(authorizedSubmission.continued, true);
    const submitted = await invoke(submitAssignment, authorizedSubmission.req);
    assert.equal(submitted.status, 201);
    assert.equal(submitted.payload.data.status, 'submitted');
    assert.equal(await LmsNotification.countDocuments({ targetUser: instructor._id, type: 'submission' }), 1);
    assert.equal(await LmsNotification.countDocuments({ targetUser: otherInstructor._id }), 0);

    const instructorDashboard = await invoke(getLmsDashboard, { user: instructor });
    assert.equal(instructorDashboard.status, 200);
    assert.equal(instructorDashboard.payload.data.counts.classes, 1);
    assert.equal(instructorDashboard.payload.data.counts.pendingGrading, 1);
    assert.equal(instructorDashboard.payload.data.pendingSubmissions[0].student.studentId, 'STU-2026-LMS');

    const adminDashboard = await invoke(getLmsDashboard, { user: admin });
    assert.equal(adminDashboard.status, 200);
    assert.equal(adminDashboard.payload.data.counts.pendingGrading, 1);

    const unrelatedInstructorDashboard = await invoke(getLmsDashboard, { user: otherInstructor });
    assert.equal(unrelatedInstructorDashboard.status, 200);
    assert.equal(unrelatedInstructorDashboard.payload.data.counts.classes, 0);
    assert.equal(unrelatedInstructorDashboard.payload.data.counts.pendingGrading, 0);

    const graded = await invoke(gradeSubmission, {
      params: { id: submitted.payload.data._id },
      body: { score: 18, feedback: 'Good work.' },
      user: instructor,
    });
    assert.equal(graded.status, 200);
    assert.equal(graded.payload.data.score, 18);
    assert.equal(graded.payload.data.status, 'graded');
    assert.equal(await LmsNotification.countDocuments({ targetUser: studentUser._id, type: 'graded' }), 1);

    const studentDashboardAfterGrade = await invoke(getLmsDashboard, { user: studentUser });
    assert.equal(studentDashboardAfterGrade.status, 200);
    assert.equal(studentDashboardAfterGrade.payload.data.counts.upcoming, 0);
    assert.equal(studentDashboardAfterGrade.payload.data.recentGrades.length, 1);

    const gradebook = await invoke(getOfferingGradebook, {
      params: { offeringId: offering._id },
      user: instructor,
    });
    assert.equal(gradebook.status, 200);
    assert.equal(gradebook.payload.data.assignments.length, 1);
    assert.equal(gradebook.payload.data.memberships.length, 1);
    assert.equal(gradebook.payload.data.submissions.length, 1);
    assert.equal(gradebook.payload.data.totalPoints, 20);

    const blockedStudentGradebook = await invoke(getOfferingGradebook, {
      params: { offeringId: offering._id },
      user: studentUser,
    });
    assert.equal(blockedStudentGradebook.status, 403);

    const pointChangeBlocked = await invoke(updateAssignment, {
      params: { id: assignmentResult.payload.data._id },
      body: { points: 25 },
      user: instructor,
    });
    assert.equal(pointChangeBlocked.status, 409);
    assert.equal(pointChangeBlocked.payload.code, 'POINT_CHANGE_CONFIRMATION_REQUIRED');

    const pointChangeConfirmed = await invoke(updateAssignment, {
      params: { id: assignmentResult.payload.data._id },
      body: { points: 25, confirmPointChange: true },
      user: instructor,
    });
    assert.equal(pointChangeConfirmed.status, 200);
    assert.equal(pointChangeConfirmed.payload.data.points, 25);

    const returned = await invoke(returnSubmission, {
      params: { id: submitted.payload.data._id },
      body: { feedback: 'Add one more example.' },
      user: instructor,
    });
    assert.equal(returned.status, 200);
    assert.equal(returned.payload.data.status, 'returned');
    assert.equal(await LmsNotification.countDocuments({ targetUser: studentUser._id, type: 'returned' }), 1);

    const markedAll = await invoke(markAllLmsNotificationsRead, { user: studentUser });
    assert.equal(markedAll.status, 200);
    assert.equal(await LmsNotification.countDocuments({ targetUser: studentUser._id, readAt: null }), 0);

    const movedDeadline = await invoke(updateAssignment, {
      params: { id: assignmentResult.payload.data._id },
      body: { dueAt: new Date(Date.now() - 60_000).toISOString() },
      user: instructor,
    });
    assert.equal(movedDeadline.status, 200);

    const resubmissionRequest = {
      params: { assignmentId: assignmentResult.payload.data._id },
      body: { text: 'Updated module response.' },
      user: studentUser,
    };
    const authorizedResubmission = await invokeMiddleware(authorizeSubmissionUpload, resubmissionRequest);
    assert.equal(authorizedResubmission.continued, true);
    const resubmitted = await invoke(submitAssignment, authorizedResubmission.req);
    assert.equal(resubmitted.status, 200);
    assert.equal(resubmitted.payload.data.status, 'late');
    assert.equal(resubmitted.payload.data.attempts.length, 2);

    const closed = await invoke(updateAssignment, {
      params: { id: assignmentResult.payload.data._id },
      body: { status: 'closed' },
      user: instructor,
    });
    assert.equal(closed.status, 200);
    assert.equal(closed.payload.data.status, 'closed');

    const blockedClosedSubmission = await invokeMiddleware(authorizeSubmissionUpload, {
      params: { assignmentId: assignmentResult.payload.data._id },
      body: { text: 'Blocked response.' },
      user: studentUser,
    });
    assert.equal(blockedClosedSubmission.continued, false);
    assert.equal(blockedClosedSubmission.status, 409);

    const archived = await invoke(deleteAssignment, {
      params: { id: assignmentResult.payload.data._id },
      user: instructor,
    });
    assert.equal(archived.status, 200);
    assert.equal(archived.payload.archived, true);
    assert.equal(archived.payload.data.status, 'archived');
    assert.equal(await LmsAssignment.countDocuments({ offering: offering._id }), 1);
    assert.equal(await LmsSubmission.countDocuments({ offering: offering._id }), 1);

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
