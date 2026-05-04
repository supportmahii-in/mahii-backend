const express = require('express');
const router = express.Router();
const {
  getUserStats,
  getUserSettings,
  updateProfile,
  updatePassword,
  updateNotificationSettings,
  updatePrivacySettings,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/stats', getUserStats);
router.get('/settings', getUserSettings);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);
router.put('/notifications', updateNotificationSettings);
router.put('/privacy', updatePrivacySettings);

module.exports = router;
