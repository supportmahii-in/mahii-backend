const express = require('express');
const router = express.Router();
const {
  startChat,
  sendMessage,
  getChatHistory,
  getAdminChats,
  resolveChat,
} = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/start', startChat);
router.post('/message', sendMessage);
router.get('/:sessionId', getChatHistory);
router.get('/admin/chats', protect, authorize('admin'), getAdminChats);
router.put('/:sessionId/resolve', protect, authorize('admin'), resolveChat);

module.exports = router;
