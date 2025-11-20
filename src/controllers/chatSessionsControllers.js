import ChatSession from '../models/ChatSession.js';
import { v4 as uuidv4 } from 'uuid';

export const getAllChatSessions = async (req, res) => {
  try {
    const { 
      user, 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const query = {};
    
    if (user) query.userId = user;
    if (status) query.status = status;
    
    const sessions = await ChatSession.find(query)
      // userId is Mixed (not a ref) → do not populate user
      .populate('generatedTrip', 'name startDate endDate')
      .select('-messages') // Exclude messages for list view
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await ChatSession.countDocuments(query);
    
    res.status(200).json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error calling getAllChatSessions", error);
    res.status(500).json({ message: "Error fetching chat sessions" });
  }
};

export const getChatSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await ChatSession.findById(id)
      .populate('generatedTrip', 'name startDate endDate destinations');
      
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }
    
    res.status(200).json(session);
  } catch (error) {
    console.error("Error calling getChatSessionById", error);
    res.status(500).json({ message: "Error fetching chat session" });
  }
};

export const getChatSessionBySessionId = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findOne({ sessionId })
      .populate('generatedTrip', 'name startDate endDate destinations');
      
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }
    
    res.status(200).json(session);
  } catch (error) {
    console.error("Error getting chat session by sessionId", error);
    res.status(500).json({ message: "Error fetching chat session" });
  }
};

export const createChatSession = async (req, res) => {
  try {
    const sessionData = req.body;
    
    // Validate required fields
    if (!sessionData.userId) {
      return res.status(400).json({ 
        message: "User ID is required" 
      });
    }
    
    // Generate unique session ID if not provided
    if (!sessionData.sessionId) {
      sessionData.sessionId = uuidv4();
    }
    
    // Set default context
    if (!sessionData.context) {
      sessionData.context = {
        currentStep: 'greeting',
        userPreferences: {},
        pendingActions: []
      };
    }
    
    const session = new ChatSession(sessionData);
    const newSession = await session.save();
    
    const populatedSession = await ChatSession.findById(newSession._id);
    
    res.status(201).json(populatedSession);
    
  } catch (error) {
    console.error("Error calling createChatSession", error);
    res.status(500).json({ message: "Error creating chat session" });
  }
};

export const updateChatSession = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow changing userId or sessionId
    delete updateData.userId;
    delete updateData.sessionId;
    
    const session = await ChatSession.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    )
    .populate('generatedTrip', 'name startDate endDate');
    
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }
    
    res.status(200).json(session);
  } catch (error) {
    console.error("Error calling updateChatSession", error);
    res.status(500).json({ message: "Error updating chat session" });
  }
};

export const addMessageToSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content, messageType, aiData } = req.body;
    
    if (!role || !content) {
      return res.status(400).json({ 
        message: "Role and content are required" 
      });
    }
    
    const session = await ChatSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }
    
    const newMessage = {
      role,
      content,
      messageType: messageType || 'text',
      aiData: aiData || {},
      timestamp: new Date()
    };
    
    session.messages.push(newMessage);
    session.lastActivity = new Date();
    
    await session.save();
    
    const updatedSession = await ChatSession.findById(id);
    
    res.status(200).json(updatedSession);
    
  } catch (error) {
    console.error("Error adding message to session", error);
    res.status(500).json({ message: "Error adding message to session" });
  }
};

export const updateSessionContext = async (req, res) => {
  try {
    const { id } = req.params;
    const { context } = req.body;
    
    const session = await ChatSession.findByIdAndUpdate(
      id,
      { 
        context,
        lastActivity: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }
    
    res.status(200).json(session);
  } catch (error) {
    console.error("Error updating session context", error);
    res.status(500).json({ message: "Error updating session context" });
  }
};

export const endChatSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { satisfactionRating } = req.body;
    
    const session = await ChatSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }
    
    // Calculate session duration
    const duration = Math.round((new Date() - session.startedAt) / (1000 * 60)); // in minutes
    
    session.status = 'completed';
    session.endedAt = new Date();
    session.sessionDuration = duration;
    
    if (satisfactionRating) {
      session.satisfactionRating = satisfactionRating;
    }
    
    await session.save();
    
    res.status(200).json(session);
  } catch (error) {
    console.error("Error ending chat session", error);
    res.status(500).json({ message: "Error ending chat session" });
  }
};

export const getUserChatSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { userId };
    if (status) query.status = status;
    
    const sessions = await ChatSession.find(query)
      .populate('generatedTrip', 'name startDate endDate')
      .select('-messages') // Exclude messages for list view
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await ChatSession.countDocuments(query);
    
    res.status(200).json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error fetching user chat sessions", error);
    res.status(500).json({ message: "Error fetching user chat sessions" });
  }
};

export const deleteChatSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await ChatSession.findByIdAndDelete(id);
    
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }
    
    res.status(200).json({ message: "Chat session deleted successfully" });
  } catch (error) {
    console.error("Error calling deleteChatSession", error);
    res.status(500).json({ message: "Error deleting chat session" });
  }
};
