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
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (không cần authentication)
router.post('/webhook', handleWebhook);
router.get('/return', handlePaymentReturn);

// Protected routes (cần authentication)
router.post('/create', authenticateToken, createPaymentLink);
router.get('/info/:orderCode', authenticateToken, getPaymentInfo);
router.get('/user-payments', authenticateToken, getUserPayments);
router.post('/cancel/:orderCode', authenticateToken, cancelPayment);

// Admin routes (cần authentication và admin role)
router.get('/stats', authenticateToken, getPaymentStats);

export default router;
