import express from 'express';
import {
  createMockCheckoutSession,
  getMockCheckoutSession,
  payMockCheckoutSession
} from './paymongoController.js';
import { protectStudentRecord } from './studentAccessMiddleware.js';

const router = express.Router();

router.post(
  '/v1/checkout_sessions',
  (req, _res, next) => {
    req.params.studentId = req.body?.data?.attributes?.reference_number || '';
    next();
  },
  protectStudentRecord,
  createMockCheckoutSession
);
router.get('/v1/checkout_sessions/:id', getMockCheckoutSession);
router.post('/v1/checkout_sessions/:id/pay', payMockCheckoutSession);

export default router;
