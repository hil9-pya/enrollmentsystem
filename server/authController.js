import asyncHandler from 'express-async-handler';
import User from './User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {
  return jwt.sign({ user: { id, role } }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const toSafeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  studentId: user.role === 'student' ? user.username : null,
});


// @desc    Register a new staff/user account
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    role,
  });

  if (user) {
    res.status(201).json({
      token: generateToken(user._id, user.role),
      user: toSafeUser(user),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    $or: [
      { email: String(email || '').toLowerCase() },
      { username: String(email || '') },
      { username: String(email || '').toUpperCase() }
    ]
  });

  if (user && (await user.comparePassword(password))) {
    res.json({
      token: generateToken(user._id, user.role),
      user: toSafeUser(user),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (user) {
    res.json(toSafeUser(user));
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

export { registerUser, loginUser, getUserProfile };
