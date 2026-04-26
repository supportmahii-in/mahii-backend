const express = require('express');
const router = express.Router();
const {
  generateQRCode,
  scanAttendance,
  markManualAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer routes
router.get('/qr/:subscriptionId', protect, authorize('customer'), generateQRCode);

// Shop owner routes
router.post('/scan', protect, authorize('shopowner'), scanAttendance);
router.post('/manual', protect, authorize('shopowner'), markManualAttendance);

module.exports = router;