import express from 'express';
import {
  register,
  login,
  getProfile,
  changePassword
} from '../controllers/authController.js';
import { verifyJWTToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (JWT only)
router.get('/profile', verifyJWTToken, getProfile);
router.put('/change-password', verifyJWTToken, changePassword);

export default router;
