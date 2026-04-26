const express = require('express');
const router = express.Router();
const {
  addReview,
  getShopReviews,
  replyToReview,
  deleteReview,
  reportReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/shop/:shopId', getShopReviews);

// Private routes
router.post('/', protect, authorize('customer'), addReview);
router.post('/:id/reply', protect, authorize('shopowner'), replyToReview);
router.delete('/:id', protect, authorize('admin'), deleteReview);
router.post('/:id/report', protect, reportReview);

module.exports = router;