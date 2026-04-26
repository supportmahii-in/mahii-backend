const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  senderType: {
    type: String,
    enum: ['customer', 'admin', 'shopowner'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  attachments: [{
    url: String,
    type: String,
    name: String,
  }],
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  userInfo: {
    name: String,
    email: String,
    phone: String,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'pending', 'closed'],
    default: 'active',
  },
  messages: [messageSchema],
  unreadCount: {
    type: Number,
    default: 0,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

chatSessionSchema.index({ userId: 1 });
chatSessionSchema.index({ status: 1 });
chatSessionSchema.index({ sessionId: 1 });
chatSessionSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('Chat', chatSessionSchema);
