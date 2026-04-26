const mongoose = require('mongoose');

const adminLoginAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    lowercase: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: false,
  },
  success: {
    type: Boolean,
    required: true,
    default: false,
  },
  message: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

adminLoginAttemptSchema.index({ ipAddress: 1, timestamp: -1 });
adminLoginAttemptSchema.index({ email: 1, timestamp: -1 });

module.exports = mongoose.model('AdminLoginAttempt', adminLoginAttemptSchema);
