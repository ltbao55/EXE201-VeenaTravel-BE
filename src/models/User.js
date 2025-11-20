import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // Firebase Authentication integration (optional for email/password users)
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true // Allow null values but maintain uniqueness when present
  },

  // Email/Password Authentication
  password: {
    type: String,
    select: false // Don't include password in queries by default
  },

  // Authentication method tracking
  authMethod: {
    type: String,
    enum: ['firebase', 'email'],
    default: 'firebase'
  },

  // Basic user information
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: String,

  // User role for admin access
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date

}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ authMethod: 1 });

// Validation: Either firebaseUid OR password must be present
userSchema.pre('save', function(next) {
  if (this.authMethod === 'firebase' && !this.firebaseUid) {
    return next(new Error('Firebase UID is required for Firebase authentication'));
  }
  if (this.authMethod === 'email' && !this.password) {
    return next(new Error('Password is required for email authentication'));
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
