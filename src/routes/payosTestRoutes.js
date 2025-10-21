import express from 'express';
import {
  checkPayOSStatus,
  createTestPayment,
  handleTestPaymentReturn,
  handleTestWebhook,
  getTestPaymentInfo
} from '../controllers/payosTestController.js';

const router = express.Router();

// Public routes for PayOS test interface
router.get('/status', checkPayOSStatus);
router.post('/create', createTestPayment);
router.get('/return', handleTestPaymentReturn);
router.post('/webhook', handleTestWebhook);
router.get('/info/:orderCode', getTestPaymentInfo);

export default router;

