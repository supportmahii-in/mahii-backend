const express = require('express');
const router = express.Router();
const {
  registerCustomer,
  registerShopOwner,
  login,
  adminLogin,
  getMe,
  setupAdmin,
  verifyAdminSecret,
  verifyMfa,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { adminRateLimiter, ipWhitelist } = require('../middleware/adminSecurityMiddleware');

const allowedIPs = process.env.ADMIN_ALLOWED_IPS
  ? process.env.ADMIN_ALLOWED_IPS.split(',').map((ip) => ip.trim())
  : ['127.0.0.1'];

// Public routes
router.post('/customer/register', registerCustomer);
router.post('/shopowner/register', registerShopOwner);
router.post('/login', login);
router.post('/verify-admin-secret', ipWhitelist(allowedIPs), adminRateLimiter, verifyAdminSecret);
router.post('/verify-mfa', ipWhitelist(allowedIPs), adminRateLimiter, verifyMfa);
router.post('/admin/login', ipWhitelist(allowedIPs), adminRateLimiter, adminLogin);
router.post('/setup-admin', setupAdmin); // One-time admin setup with secret key

// Private routes
router.get('/me', protect, getMe);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!' });
});

module.exports = router;