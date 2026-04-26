const express = require('express');
const router = express.Router();
const {
  createOrderPayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentDetails,
  generateInvoice,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes
router.post('/create-order', protect, createOrderPayment);
router.post('/verify', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);
router.get('/:id', protect, getPaymentDetails);
router.get('/:id/invoice', protect, generateInvoice);

module.exports = router;