import asyncHandler from 'express-async-handler';
import Course from './Course.js';

// @desc    Fetch all courses
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({}).populate('instructor', 'firstName lastName');
  res.json(courses);
});

// @desc    Fetch single course
// @route   GET /api/courses/:id
// @access  Public
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate(
    'instructor',
    'firstName lastName'
  );

  if (course) {
    res.json(course);
  } else {
    res.status(404);
    throw new Error('Course not found');
  }
});

// @desc    Create a course
// @route   POST /api/courses
// @access  Private/Admin or Instructor
const createCourse = asyncHandler(async (req, res) => {
  const { title, description, code, credits } = req.body;

  const course = new Course({
    title,
    description,
    code,
    credits,
    instructor: req.user._id, // The logged-in user is the instructor
  });

  const createdCourse = await course.save();
  res.status(201).json(createdCourse);
});

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Admin or Instructor
const updateCourse = asyncHandler(async (req, res) => {
  const { title, description, code, credits } = req.body;

  const course = await Course.findById(req.params.id);

  if (course) {
    // Check if the user is the instructor or an admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('User not authorized to update this course');
    }

    course.title = title || course.title;
    course.description = description || course.description;
    course.code = code || course.code;
    course.credits = credits || course.credits;

    const updatedCourse = await course.save();
    res.json(updatedCourse);
  } else {
    res.status(404);
    throw new Error('Course not found');
  }
});

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Admin or Instructor
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (course) {
    // Check if the user is the instructor or an admin
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('User not authorized to delete this course');
    }

    await course.deleteOne();
    res.json({ message: 'Course removed' });
  } else {
    res.status(404);
    throw new Error('Course not found');
  }
});

export {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};