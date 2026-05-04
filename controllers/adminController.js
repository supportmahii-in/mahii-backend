const crypto = require('crypto');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Contact = require('../models/Contact');
const AdminInvite = require('../models/AdminInvite');
const sendEmail = require('../utils/email');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalShopOwners = await User.countDocuments({ role: 'shopowner' });
    const pendingShopOwners = await User.countDocuments({ role: 'shopowner', isApproved: false });
    
    const totalShops = await Shop.countDocuments();
    const pendingShops = await Shop.countDocuments({ isActive: false });
    const activeShops = await Shop.countDocuments({ isActive: true });
    
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'delivered' });
    
    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ isActive: true });
    
    // Revenue calculations
    const payments = await Payment.find({ status: 'success' });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPayments = await Payment.find({
      status: 'success',
      createdAt: { $gte: today }
    });
    const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Platform commission (assuming 10%)
    const platformCommission = totalRevenue * 0.10;
    
    // Recent orders
    const recentOrders = await Order.find()
      .populate('userId', 'name email')
      .populate('shopId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Recent subscriptions
    const recentSubscriptions = await Subscription.find()
      .populate('userId', 'name email')
      .populate('shopId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Pending shop owners (not approved)
    const pendingShopOwnersDetails = await User.find({ role: 'shopowner', isApproved: false })
      .select('_id name email phone fssaiLicense bankDetails createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Pending shops (not active)
    const pendingShopsDetails = await Shop.find({ isActive: false })
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          shopOwners: totalShopOwners,
          pendingApproval: pendingShopOwners,
        },
        shops: {
          total: totalShops,
          active: activeShops,
          pending: pendingShops,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders,
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
        },
        revenue: {
          total: totalRevenue,
          today: todayRevenue,
          platformCommission: platformCommission,
        },
      },
      recentOrders,
      recentSubscriptions,
      pendingShopOwnersDetails,
      pendingShopsDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all users (with filters)
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isVerified, isApproved, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (isVerified) query.isVerified = isVerified === 'true';
    if (isApproved) query.isApproved = isApproved === 'true';
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Get user's orders
    const orders = await Order.find({ userId: user._id })
      .populate('shopId', 'name')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Get user's subscriptions
    const subscriptions = await Subscription.find({ userId: user._id })
      .populate('shopId', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      user,
      orders,
      subscriptions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update user (block/unblock, approve)
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { isApproved, isVerified, role, blockReason } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    if (isApproved !== undefined) user.isApproved = isApproved;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (role) user.role = role;
    if (blockReason) user.blockReason = blockReason;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    await user.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all shops (admin view)
// @route   GET /api/admin/shops
// @access  Private (Admin only)
exports.getAllShops = async (req, res) => {
  try {
    const { category, isActive, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (category) query.category = category;
    if (isActive) query.isActive = isActive === 'true';
    
    const shops = await Shop.find(query)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Shop.countDocuments(query);
    
    res.status(200).json({
      success: true,
      shops,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Approve/reject shop
// @route   PUT /api/admin/shops/:id/approve
// @desc    Get revenue report
// @route   GET /api/admin/reports/revenue
// @access  Private (Admin only)
exports.getRevenueReport = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();
      if (period === 'week') {
        start.setDate(start.getDate() - 7);
      } else if (period === 'month') {
        start.setMonth(start.getMonth() - 1);
      } else if (period === 'year') {
        start.setFullYear(start.getFullYear() - 1);
      }
    }
    
    const payments = await Payment.find({
      status: 'success',
      createdAt: { $gte: start, $lte: end },
    });
    
    // Group by date
    const revenueByDate = {};
    payments.forEach(payment => {
      const date = payment.createdAt.toISOString().split('T')[0];
      if (!revenueByDate[date]) {
        revenueByDate[date] = 0;
      }
      revenueByDate[date] += payment.amount;
    });
    
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const platformCommission = totalRevenue * 0.10;
    const shopOwnerPayout = totalRevenue - platformCommission;
    
    res.status(200).json({
      success: true,
      report: {
        period,
        startDate: start,
        endDate: end,
        totalRevenue,
        platformCommission,
        shopOwnerPayout,
        revenueByDate,
        transactionCount: payments.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get pending shops for approval
// @route   GET /api/admin/shops/pending
// @access  Private (Admin only)
exports.getPendingShops = async (req, res) => {
  try {
    const pendingShops = await Shop.find({ 
      isActive: false, 
      isApproved: false 
    }).populate('ownerId', 'name email phone');
    
    res.status(200).json({
      success: true,
      count: pendingShops.length,
      shops: pendingShops,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Approve shop (makes it visible on explore page)
// @route   PUT /api/admin/shops/:id/approve
// @access  Private (Admin only)
exports.approveShop = async (req, res) => {
  try {
    const { remarks } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }
    
    // Activate shop - NOW VISIBLE ON EXPLORE PAGE
    shop.isActive = true;
    shop.isApproved = true;
    shop.approvedAt = new Date();
    shop.approvedBy = req.user.id;
    shop.rejectionReason = null;
    await shop.save();
    
    // Update shop owner's approval status
    await User.findByIdAndUpdate(shop.ownerId, { 
      isApproved: true,
      approvalStatus: 'approved',
    });
    
    res.status(200).json({
      success: true,
      message: 'Shop approved and now visible to customers on explore page',
      shop,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reject shop
// @route   PUT /api/admin/shops/:id/reject
// @access  Private (Admin only)
exports.rejectShop = async (req, res) => {
  try {
    const { reason } = req.body;
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }
    
    shop.isActive = false;
    shop.isApproved = false;
    shop.rejectionReason = reason;
    await shop.save();
    
    res.status(200).json({
      success: true,
      message: 'Shop rejected',
      shop,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get shop details for admin review
// @route   GET /api/admin/shops/:id/review
// @access  Private (Admin only)
exports.getShopForReview = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('ownerId', 'name email phone fssaiLicense bankDetails');

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    res.status(200).json({
      success: true,
      shop,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Generate admin invitation code
// @route   POST /api/admin/invite
// @access  Private (Super Admin only)
exports.generateAdminInvite = async (req, res) => {
  try {
    const { email, role, permissions, expiresInDays } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Invite email is required',
      });
    }

    const inviteCode = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    const invite = await AdminInvite.create({
      code: inviteCode,
      email: email.toLowerCase(),
      role: role || 'admin',
      permissions: permissions || ['users', 'shops', 'orders'],
      createdBy: req.user.id,
      expiresAt,
    });

    await sendEmail({
      to: email,
      subject: 'Admin Invitation - Mahii',
      html: `
        <h2>You've been invited as an Admin</h2>
        <p>Use the following link to complete your registration:</p>
        <a href="${process.env.FRONTEND_URL}/admin-register/${inviteCode}">Complete registration</a>
        <p>This link expires in ${expiresInDays || 7} days.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: 'Invitation sent successfully',
      invite: {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get platform settings
// @route   GET /api/admin/settings
// @access  Private (Admin only)
exports.getSettings = async (req, res) => {
  try {
    // You can store settings in a separate Settings model
    const settings = {
      commissionRate: 10, // percentage
      deliveryCharge: 40,
      taxRate: 5,
      minOrderAmount: 99,
      maxOrderAmount: 10000,
      supportEmail: 'support@mahii.com',
      supportPhone: '+91-XXXXXXXXXX',
      socialLinks: {
        instagram: 'https://instagram.com/mahii',
        facebook: 'https://facebook.com/mahii',
        twitter: 'https://twitter.com/mahii',
      },
    };

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get revenue analytics data
// @route   GET /api/admin/analytics/revenue
// @access  Private (Admin only)
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let start = new Date();
    if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start.setMonth(start.getMonth() - 1);
    } else if (period === 'year') {
      start.setFullYear(start.getFullYear() - 1);
    }

    const payments = await Payment.find({
      status: 'success',
      createdAt: { $gte: start },
    });

    // Group by month for chart data
    const revenueByMonth = {};
    payments.forEach(payment => {
      const month = payment.createdAt.toLocaleString('default', { month: 'short' });
      if (!revenueByMonth[month]) {
        revenueByMonth[month] = 0;
      }
      revenueByMonth[month] += payment.amount;
    });

    const chartData = Object.keys(revenueByMonth).map(month => ({
      name: month,
      revenue: revenueByMonth[month],
    }));

    res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get sales analytics data
// @route   GET /api/admin/analytics/sales
// @access  Private (Admin only)
exports.getSalesAnalytics = async (req, res) => {
  try {
    const orders = await Order.find().populate('shopId', 'category');

    // Group by category
    const salesByCategory = {};
    orders.forEach(order => {
      const category = order.shopId?.category || 'Other';
      if (!salesByCategory[category]) {
        salesByCategory[category] = 0;
      }
      salesByCategory[category] += order.totalAmount;
    });

    const chartData = Object.keys(salesByCategory).map(category => ({
      name: category,
      value: salesByCategory[category],
    }));

    res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get user analytics data
// @route   GET /api/admin/analytics/users
// @access  Private (Admin only)
exports.getUserAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const customers = await User.countDocuments({ role: 'customer' });
    const shopOwners = await User.countDocuments({ role: 'shopowner' });
    const admins = await User.countDocuments({ role: { $in: ['admin', 'super_admin'] } });

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        customers,
        shopOwners,
        admins,
        recentUsers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get order analytics data
// @route   GET /api/admin/analytics/orders
// @access  Private (Admin only)
exports.getOrderAnalytics = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });

    // Recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        recentOrders,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};