const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
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
  planType: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly'],
    required: true,
  },
  planName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  mealsPerDay: {
    type: Number,
    required: true,
    default: 2,
  },
  mealTimings: {
    breakfast: { type: String, default: '08:00-09:00' },
    lunch: { type: String, default: '12:30-14:00' },
    dinner: { type: String, default: '19:30-21:00' },
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  totalMeals: {
    type: Number,
    required: true,
  },
  mealsConsumed: {
    type: Number,
    default: 0,
  },
  mealsRemaining: {
    type: Number,
    default: 0,
  },
  attendance: [{
    date: {
      type: Date,
      required: true,
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'holiday', 'pending'],
      default: 'pending',
    },
    markedBy: {
      type: String,
      enum: ['user', 'shopkeeper', 'qr'],
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    qrCode: String,
  }],
  razorpaySubscriptionId: String,
  razorpayOrderId: String,
  lastPaymentDate: Date,
  nextPaymentDate: Date,
  paymentHistory: [{
    amount: Number,
    date: Date,
    razorpayPaymentId: String,
    status: String,
  }],
  cancelledAt: Date,
  cancellationReason: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Update meals remaining before saving
subscriptionSchema.pre('save', function(next) {
  this.mealsRemaining = this.totalMeals - this.mealsConsumed;
  next();
});

// Indexes
subscriptionSchema.index({ userId: 1, isActive: 1 });
subscriptionSchema.index({ shopId: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ userId: 1, shopId: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);