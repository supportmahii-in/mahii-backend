const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add product name'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Please add price'],
    min: 0,
  },
  category: {
    type: String,
    required: true,
    enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'desserts', 'starters', 'main-course'],
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Please add description'],
  },
  image: {
    type: String,
    default: null,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  veg: {
    type: Boolean,
    default: true,
  },
  customizationOptions: [{
    name: String,
    price: Number,
  }],
  preparationTime: {
    type: Number,
    default: 15, // minutes
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for search
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ shopId: 1 });
productSchema.index({ price: 1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model('Product', productSchema);