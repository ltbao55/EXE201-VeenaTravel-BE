import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { checkChatSessionCreationLimit } from '../middleware/subscription.js';
import {
  getAllChatSessions,
  getChatSessionById,
  getChatSessionBySessionId,
  createChatSession,
  updateChatSession,
  addMessageToSession,
  updateSessionContext,
  endChatSession,
  getUserChatSessions,
  deleteChatSession
} from '../controllers/chatSessionsControllers.js';

const router = express.Router();

// Get all chat sessions with filters
router.get("/", getAllChatSessions);

// Get chat session by ID
router.get("/:id", getChatSessionById);

// Get chat session by session ID
router.get("/session/:sessionId", getChatSessionBySessionId);

// Create new chat session (require auth + session limit for free plan)
router.post("/", verifyToken, checkChatSessionCreationLimit, createChatSession);

// Update chat session
router.put("/:id", updateChatSession);

// Delete chat session
router.delete("/:id", deleteChatSession);

// Add message to chat session (require auth)
router.post("/:id/messages", verifyToken, addMessageToSession);

// Update session context (require auth)
router.put("/:id/context", verifyToken, updateSessionContext);

// End chat session (require auth)
router.put("/:id/end", verifyToken, endChatSession);

// Get user's chat sessions (require auth)
router.get("/user/:userId", verifyToken, getUserChatSessions);

export default router;
