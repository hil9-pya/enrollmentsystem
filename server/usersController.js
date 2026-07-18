import asyncHandler from 'express-async-handler';
import User from './User.js';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ role: 1, createdAt: -1 });
  res.json(users);
});

// @desc    Create a new user
// @route   POST /api/admin/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, role } = req.body;

  const userExists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }]
  });

  if (userExists) {
    res.status(400);
    throw new Error('User with this email or username already exists');
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
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.username = req.body.username || user.username;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.role === 'admin' && req.user._id.toString() === user._id.toString()) {
      res.status(400);
      throw new Error('You cannot delete your own admin account');
    }
    await User.deleteOne({ _id: user._id });
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

export { getUsers, createUser, updateUser, deleteUser };
