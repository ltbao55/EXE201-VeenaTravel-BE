import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createDefaultSubscription } from '../controllers/userSubscriptionsController.js';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
};

// Middleware to verify JWT token (for email/password auth)
export const verifyJWTToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided or invalid format'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Find user in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user info to request
    req.user = user;

    next();
  } catch (error) {
    console.error('JWT token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Middleware to verify Firebase ID token
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided or invalid format'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Initialize Firebase if not already done
    initializeFirebase();
    
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Find or create user in our database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        avatar: decodedToken.picture,
        lastLogin: new Date()
      });
      await user.save();
      
      // Create default free subscription for new user
      try {
        await createDefaultSubscription(user._id);
      } catch (subscriptionError) {
        console.error('Failed to create default subscription:', subscriptionError);
        // Don't fail authentication if subscription creation fails
      }
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }
    
    // Add user info to request
    req.user = user;
    req.firebaseUser = decodedToken;
    
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Middleware to check if user is admin
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authorization check'
    });
  }
};

// Dual authentication middleware (supports both Firebase and JWT)
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided or invalid format'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Try JWT first (for email/password auth)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
        req.authMethod = 'jwt';
        return next();
      }
    } catch (jwtError) {
      // JWT verification failed, try Firebase token
    }

    // Try Firebase token
    try {
      initializeFirebase();
      const decodedToken = await admin.auth().verifyIdToken(token);

      let user = await User.findOne({ firebaseUid: decodedToken.uid });

      if (!user) {
        // Create new user if doesn't exist
        user = new User({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          avatar: decodedToken.picture,
          authMethod: 'firebase',
          lastLogin: new Date()
        });
        await user.save();

        try {
          await createDefaultSubscription(user._id);
        } catch (subscriptionError) {
          console.error('Failed to create default subscription:', subscriptionError);
        }
      } else {
        user.lastLogin = new Date();
        await user.save();
      }

      req.user = user;
      req.firebaseUser = decodedToken;
      req.authMethod = 'firebase';
      return next();

    } catch (firebaseError) {
      console.error('Token verification failed:', { jwtError: 'JWT failed', firebaseError });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split('Bearer ')[1];

    // Try JWT first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
        req.authMethod = 'jwt';
        return next();
      }
    } catch (jwtError) {
      // Continue to Firebase attempt
    }

    // Try Firebase token
    try {
      initializeFirebase();
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await User.findOne({ firebaseUid: decodedToken.uid });

      if (user) {
        req.user = user;
        req.firebaseUser = decodedToken;
        req.authMethod = 'firebase';
      }
    } catch (firebaseError) {
      // Don't fail on optional auth
    }

    next();
  } catch (error) {
    // Don't fail on optional auth, just continue without user
    next();
  }
};
