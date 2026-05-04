const mongoose = require('mongoose');

const specialDishSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  dishName: {
    type: String,
    required: true,
  },
  description: String,
  price: Number,
  image: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  validUntil: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SpecialDish', specialDishSchema);