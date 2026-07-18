import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from './usersController.js';
import { protect, authorize } from './authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin')); // Only admins can access these routes

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

export default router;
