const mongoose = require('mongoose');

const adminInviteSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin',
  },
  permissions: [{
    type: String,
    enum: ['users', 'shops', 'orders', 'payments', 'reports', 'settings'],
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

adminInviteSchema.index({ code: 1 });
adminInviteSchema.index({ email: 1 });
adminInviteSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('AdminInvite', adminInviteSchema);
