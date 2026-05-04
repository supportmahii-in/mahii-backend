const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner'],
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'pending'],
    default: 'present',
  },
  markedBy: {
    type: String,
    enum: ['student', 'shopkeeper', 'qr'],
    default: 'student',
  },
  markedAt: {
    type: Date,
    default: Date.now,
  },
  qrCode: String,
}, {
  timestamps: true,
});

// Ensure one attendance per user per meal per day
attendanceSchema.index({ subscriptionId: 1, date: 1, mealType: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);