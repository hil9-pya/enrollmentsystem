import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
} from './authController.js';
import { protect } from './authMiddleware.js';
import { body } from 'express-validator';
import { validateRequest } from './validationMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Apply rate limiting to auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 200, // generous limit in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

router.post(
  '/register',
  authLimiter,
  [
    body('username', 'Username is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    body('firstName', 'First name is required').not().isEmpty(),
    body('lastName', 'Last name is required').not().isEmpty(),
  ],
  validateRequest,
  registerUser
);

router.post('/login', authLimiter, loginUser);

router.get('/profile', protect, getUserProfile);

export default router;