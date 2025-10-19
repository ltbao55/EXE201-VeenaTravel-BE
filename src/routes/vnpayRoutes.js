import express from 'express';
import {
  createPaymentUrl,
  handleReturnUrl,
  handleIpnUrl,
  queryTransaction,
  createRefund,
  getBankList,
  getTransactionInfo
} from '../controllers/vnpayController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (không cần authentication)
router.get('/return', handleReturnUrl);
router.get('/ipn', handleIpnUrl);

// Protected routes (cần authentication)
router.post('/create-payment-url', verifyToken, createPaymentUrl);
router.post('/query-transaction', verifyToken, queryTransaction);
router.post('/create-refund', verifyToken, createRefund);
router.get('/transaction/:txnRef', verifyToken, getTransactionInfo);

// Public utility routes
router.get('/banks', getBankList);

export default router;
