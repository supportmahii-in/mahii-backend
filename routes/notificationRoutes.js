const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  sendBulkNotification,
  getPreferences,
  updatePreferences,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// User routes
router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);
router.get('/preferences', protect, getPreferences);
router.put('/preferences', protect, updatePreferences);

// Admin only routes
router.post('/create', protect, authorize('admin'), createNotification);
router.post('/bulk', protect, authorize('admin'), sendBulkNotification);

module.exports = router;