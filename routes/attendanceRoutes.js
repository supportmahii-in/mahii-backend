const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendanceAnalytics,
  getMyAttendance,
  getAttendanceByDate,
  generateQRCode,
  scanAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Student routes
router.post('/mark', protect, authorize('customer'), markAttendance);
router.get('/my/:subscriptionId', protect, authorize('customer'), getMyAttendance);
router.get('/qr/:subscriptionId', protect, authorize('customer'), generateQRCode);

// Shop owner routes
router.get('/analytics', protect, authorize('shopowner'), getAttendanceAnalytics);
router.get('/by-date', protect, authorize('shopowner'), getAttendanceByDate);
router.post('/scan', protect, authorize('shopowner'), scanAttendance);

module.exports = router;