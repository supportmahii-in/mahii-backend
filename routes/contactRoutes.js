const express = require('express');
const router = express.Router();
const {
  submitContact,
  getMessages,
  updateMessageStatus,
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route
router.post('/submit', submitContact);

// Admin routes
router.get('/', protect, authorize('admin'), getMessages);
router.put('/:id', protect, authorize('admin'), updateMessageStatus);

module.exports = router;