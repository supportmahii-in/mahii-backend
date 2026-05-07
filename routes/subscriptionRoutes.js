const express = require('express');
const router = express.Router();
const {
  getPlans,
  createSubscription,
  activateSubscription,
  getMySubscriptions,
  markAttendance,
  getAttendanceHistory,
  cancelSubscription,
  closeSubscriptionByOwner,
  getShopSubscriptions,
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/plans/:shopId', getPlans);

// Shop Owner routes - MUST come BEFORE /my route to avoid conflicts
router.get('/shop/:shopId', protect, authorize('shopowner'), getShopSubscriptions);

// Protected routes (Customer)
router.post('/create', protect, authorize('customer'), createSubscription);
router.post('/activate/:id', protect, authorize('customer'), activateSubscription);
router.get('/my', protect, authorize('customer'), getMySubscriptions);
router.post('/attendance', protect, authorize('customer'), markAttendance);
router.get('/attendance/:subscriptionId', protect, getAttendanceHistory);
router.put('/:id/cancel', protect, authorize('customer'), cancelSubscription);
router.put('/:id/close', protect, authorize('shopowner'), closeSubscriptionByOwner);

module.exports = router;