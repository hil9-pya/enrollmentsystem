import asyncHandler from 'express-async-handler';
import Enrollment from './Enrollment.js';
import Course from './Course.js';

// @desc    Enroll a student in a course
// @route   POST /api/enrollments
// @access  Private/Student
const createEnrollment = asyncHandler(async (req, res) => {
  const { courseId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  const alreadyEnrolled = await Enrollment.findOne({
    course: courseId,
    student: req.user._id,
  });

  if (alreadyEnrolled) {
    res.status(400);
    throw new Error('You are already enrolled in this course');
  }

  const enrollment = new Enrollment({
    course: courseId,
    student: req.user._id,
  });

  const createdEnrollment = await enrollment.save();
  res.status(201).json(createdEnrollment);
});

// @desc    Get enrollments for a student
// @route   GET /api/enrollments/myenrollments
// @access  Private/Student
const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id }).populate(
    'course',
    'title code'
  );
  res.json(enrollments);
});

// @desc    Get all enrollments for a specific course
// @route   GET /api/enrollments/course/:courseId
// @access  Private/Instructor or Admin
const getEnrollmentsByCourse = asyncHandler(async (req, res) => {
    const enrollments = await Enrollment.find({ course: req.params.courseId })
        .populate('student', 'firstName lastName email');

    // Optional: Check if the logged-in user is the instructor for this course
    const course = await Course.findById(req.params.courseId);
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to view enrollments for this course');
    }

    res.json(enrollments);
});

export { createEnrollment, getMyEnrollments, getEnrollmentsByCourse };