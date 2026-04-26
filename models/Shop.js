const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add shop name'],
    trim: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    enum: ['mess', 'hotel', 'cafe', 'dessert', 'stall'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  location: {
    city: { type: String, required: true },
    area: { type: String, required: true },
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  timings: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '22:00' },
  },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  pureVeg: { type: Boolean, default: false },
  tableBooking: { type: Boolean, default: false },
  images: [String],
  coverImage: String,
  contactNumber: { type: String, required: true },

  // Approval Status
  isActive: {
    type: Boolean,
    default: false,  // False until admin approves
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  isRejected: {
    type: Boolean,
    default: false,
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

  // Pending Edits (for edit approval workflow)
  pendingEdits: {
    type: mongoose.Schema.Types.Mixed,
    default: null,  // Stores pending changes
  },
  hasPendingEdits: {
    type: Boolean,
    default: false,
  },
  editSubmittedAt: {
    type: Date,
    default: null,
  },
  editEditHistory: [{
    submittedAt: Date,
    submittedBy: mongoose.Schema.Types.ObjectId,
    changes: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
    },
    adminNotes: String,
    reviewedAt: Date,
    reviewedBy: mongoose.Schema.Types.ObjectId,
  }],

  costForTwo: { type: Number, default: 300 },
  facilities: [String],
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Indexes
shopSchema.index({ 'location.lat': 1, 'location.lng': 1 });
shopSchema.index({ category: 1 });
shopSchema.index({ rating: -1 });
shopSchema.index({ isActive: 1 }); // Important for filtering active shops

module.exports = mongoose.model('Shop', shopSchema);