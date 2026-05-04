const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllShops,
  getPendingShops,
  approveShop,
  rejectShop,
  getShopForReview,
  getRevenueReport,
  getSettings,
  generateAdminInvite,
  getRevenueAnalytics,
  getSalesAnalytics,
  getUserAnalytics,
  getOrderAnalytics,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(protect, authorize('admin', 'super_admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/users', getUserAnalytics);
router.get('/analytics/orders', getOrderAnalytics);
router.get('/analytics/sales', getSalesAnalytics);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Shop management
router.get('/shops', getAllShops);
router.get('/shops/pending', getPendingShops);           // Add this
router.get('/shops/:id/review', getShopForReview);       // Add this
router.put('/shops/:id/approve', approveShop);           // Add this
router.put('/shops/:id/reject', rejectShop);             // Add this

// Reports
router.get('/reports/revenue', getRevenueReport);

// Admin invite generation (Super Admin only)
router.post('/invite', authorize('super_admin'), generateAdminInvite);

// Settings
router.get('/settings', getSettings);

module.exports = router;