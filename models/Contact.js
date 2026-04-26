const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
    enum: ['general', 'order', 'subscription', 'payment', 'partnership', 'complaint', 'feedback'],
  },
  message: {
    type: String,
    required: true,
  },
  attachment: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'resolved', 'closed'],
    default: 'pending',
  },
  adminReply: {
    message: String,
    repliedAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Contact', contactSchema);