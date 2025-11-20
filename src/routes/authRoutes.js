import express from 'express';
import {
  register,
  login,
  verifyToken as verifyTokenController,
  getProfile,
  changePassword
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (supports both JWT and Firebase)
router.post('/verify', verifyToken, verifyTokenController);
router.get('/profile', verifyToken, getProfile);
router.put('/change-password', verifyToken, changePassword);

export default router;
