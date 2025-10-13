import express from 'express';
import {
  createPaymentLink,
  getPaymentInfo,
  getUserPayments,
  cancelPayment,
  handlePaymentReturn,
  handleWebhook,
  getPaymentStats
} from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (không cần authentication)
router.post('/webhook', handleWebhook);
router.get('/return', handlePaymentReturn);

// Protected routes (cần authentication)
router.post('/create', verifyToken, createPaymentLink);
router.get('/info/:orderCode', verifyToken, getPaymentInfo);
router.get('/user-payments', verifyToken, getUserPayments);
router.post('/cancel/:orderCode', verifyToken, cancelPayment);

// Admin routes (cần authentication và admin role)
router.get('/stats', verifyToken, getPaymentStats);

export default router;
