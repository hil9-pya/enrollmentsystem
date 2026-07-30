import express from 'express';
import {
  createMockCheckoutSession,
  getMockCheckoutSession,
  payMockCheckoutSession
} from './paymongoController.js';

const router = express.Router();

router.post('/v1/checkout_sessions', createMockCheckoutSession);
router.get('/v1/checkout_sessions/:id', getMockCheckoutSession);
router.post('/v1/checkout_sessions/:id/pay', payMockCheckoutSession);

export default router;
