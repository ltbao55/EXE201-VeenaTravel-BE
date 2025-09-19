import express from 'express';
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

// Create new chat session
router.post("/", createChatSession);

// Update chat session
router.put("/:id", updateChatSession);

// Delete chat session
router.delete("/:id", deleteChatSession);

// Add message to chat session
router.post("/:id/messages", addMessageToSession);

// Update session context
router.put("/:id/context", updateSessionContext);

// End chat session
router.put("/:id/end", endChatSession);

// Get user's chat sessions
router.get("/user/:userId", getUserChatSessions);

export default router;
