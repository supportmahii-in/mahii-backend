const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add email'],
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please add password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['customer', 'shopowner', 'admin', 'super_admin'],
    default: 'customer',
  },
  profileImage: String,
  bio: {
    type: String,
    default: '',
  },
  notificationSettings: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    orderUpdates: {
      type: Boolean,
      default: true,
    },
    promotionalEmails: {
      type: Boolean,
      default: false,
    },
    smsAlerts: {
      type: Boolean,
      default: true,
    },
  },
  privacySettings: {
    showProfile: {
      type: Boolean,
      default: true,
    },
    showEmail: {
      type: Boolean,
      default: false,
    },
    showPhone: {
      type: Boolean,
      default: false,
    },
    showOrderHistory: {
      type: Boolean,
      default: true,
    },
  },
  language: {
    type: String,
    default: 'en',
  },
  currency: {
    type: String,
    default: 'INR',
  },
  adminSessionId: {
    type: String,
    default: null,
  },
  adminSessionIp: {
    type: String,
    default: null,
  },
  adminSessionExpiresAt: {
    type: Date,
    default: null,
  },
  mfaEnabled: {
    type: Boolean,
    default: false,
  },
  mfaSecret: {
    type: String,
    default: null,
  },
  collegeName: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  fssaiLicense: String,
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    upiId: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  // Approval workflow for shopkeepers
  isApproved: {
    type: Boolean,
    default: false,  // Shopkeepers need admin approval
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);