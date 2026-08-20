import express from 'express';
import {
  loginUser,
  getUserProfile,
} from './authController.js';
import { protect } from './authMiddleware.js';
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

router.post('/login', authLimiter, loginUser);

router.get('/profile', protect, getUserProfile);

export default router;
