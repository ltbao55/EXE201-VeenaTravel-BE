import express from 'express';
import {
  createPaymentLink,
  getPaymentInfo,
  getUserPayments,
  cancelPayment,
  handlePaymentReturn,
  handleWebhook,
  getPaymentStats,
  // VNPay methods
  createVNPayPaymentUrl,
  handleVNPayReturn,
  handleVNPayIPN,
  queryVNPayTransaction,
  refundVNPayTransaction,
  getVNPayBankList
} from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// =============== PAYOS ROUTES ===============
// Public routes (không cần authentication)
router.post('/webhook', handleWebhook);
router.get('/return', handlePaymentReturn);

// Protected routes (cần authentication)
router.post('/create', verifyToken, createPaymentLink);
router.get('/info/:orderCode', verifyToken, getPaymentInfo);
router.get('/user-payments', verifyToken, getUserPayments);
router.post('/cancel/:orderCode', verifyToken, cancelPayment);

// =============== VNPAY ROUTES ===============
// Public routes (không cần authentication)
router.get('/vnpay-return', handleVNPayReturn);
router.get('/vnpay-ipn', handleVNPayIPN);

// Protected routes (cần authentication)
router.post('/vnpay/create', verifyToken, createVNPayPaymentUrl);
router.post('/vnpay/query', verifyToken, queryVNPayTransaction);
router.post('/vnpay/refund', verifyToken, refundVNPayTransaction);
router.get('/vnpay/banks', getVNPayBankList);

// Admin routes (cần authentication và admin role)
router.get('/stats', verifyToken, getPaymentStats);

export default router;
