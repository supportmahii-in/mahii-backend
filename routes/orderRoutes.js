const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getShopOrders,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer routes
router.post('/', protect, authorize('customer'), createOrder);
router.get('/my-orders', protect, authorize('customer'), getMyOrders);
router.get('/:id', protect, getOrderById);

// Shop Owner routes
router.get('/shop/:shopId', protect, authorize('shopowner'), getShopOrders);
router.put('/:id/status', protect, updateOrderStatus);

module.exports = router;