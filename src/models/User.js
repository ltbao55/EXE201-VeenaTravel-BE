import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // Basic user information
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
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
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);
export default User;
