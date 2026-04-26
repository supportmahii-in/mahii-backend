const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    let query = { userId: req.user.id };
    if (unreadOnly === 'true') query.isRead = false;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });
    
    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
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

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
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

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
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

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted',
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

// @desc    Create notification (Admin/System)
// @route   POST /api/notifications/create
// @access  Private (Admin only)
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, priority, data, actions, image, scheduledFor } = req.body;
    
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      priority: priority || 'medium',
      data: data || {},
      actions: actions || [],
      image,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    });
    
    // If real-time socket is available, emit here
    // io.to(userId).emit('new-notification', notification);
    
    res.status(201).json({
      success: true,
      message: 'Notification created',
      notification,
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

// @desc    Send bulk notification to all users
// @route   POST /api/notifications/bulk
// @access  Private (Admin only)
exports.sendBulkNotification = async (req, res) => {
  try {
    const { title, message, type, role, priority } = req.body;
    
    let query = {};
    if (role) query.role = role;
    
    const users = await User.find(query).select('_id');
    
    const notifications = [];
    for (const user of users) {
      notifications.push({
        userId: user._id,
        title,
        message,
        type: type || 'system',
        priority: priority || 'medium',
      });
    }
    
    await Notification.insertMany(notifications);
    
    res.status(201).json({
      success: true,
      message: `Bulk notification sent to ${users.length} users`,
      count: users.length,
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

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
exports.getPreferences = async (req, res) => {
  try {
    // You can store preferences in User model or separate model
    const preferences = {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      orderUpdates: true,
      paymentUpdates: true,
      subscriptionReminders: true,
      promotionalOffers: true,
    };
    
    res.status(200).json({
      success: true,
      preferences,
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

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
exports.updatePreferences = async (req, res) => {
  try {
    const preferences = req.body;
    // Save to user model or preferences model
    // await User.findByIdAndUpdate(req.user.id, { notificationPreferences: preferences });
    
    res.status(200).json({
      success: true,
      message: 'Preferences updated',
      preferences,
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

// Helper function to create order notification
exports.createOrderNotification = async (userId, orderId, status) => {
  const titles = {
    confirmed: 'Order Confirmed! 🎉',
    preparing: 'Order Being Prepared 🍳',
    ready: 'Order Ready for Pickup ✅',
    delivered: 'Order Delivered 🚚',
    cancelled: 'Order Cancelled ❌',
  };
  
  const messages = {
    confirmed: 'Your order has been confirmed and will be prepared soon.',
    preparing: 'The restaurant is preparing your delicious food.',
    ready: 'Your order is ready! Please collect it.',
    delivered: 'Your order has been delivered. Enjoy your meal!',
    cancelled: 'Your order has been cancelled. Contact support for refund.',
  };
  
  await Notification.create({
    userId,
    title: titles[status] || `Order ${status}`,
    message: messages[status] || `Your order #${orderId} is ${status}`,
    type: 'order',
    data: { orderId, status },
    actions: [{ label: 'View Order', url: `/orders/${orderId}`, type: 'navigate' }],
  });
};

// Helper function to create subscription notification
exports.createSubscriptionNotification = async (userId, subscriptionId, type) => {
  const notifications = {
    active: {
      title: 'Subscription Activated! 🎉',
      message: 'Your mess subscription is now active. Enjoy your meals!',
    },
    expiring: {
      title: 'Subscription Expiring Soon ⚠️',
      message: 'Your subscription will expire in 3 days. Renew now to continue.',
    },
    expired: {
      title: 'Subscription Expired',
      message: 'Your subscription has expired. Renew to continue enjoying meals.',
    },
    renewed: {
      title: 'Subscription Renewed ✅',
      message: 'Your subscription has been automatically renewed.',
    },
  };
  
  await Notification.create({
    userId,
    title: notifications[type].title,
    message: notifications[type].message,
    type: 'subscription',
    data: { subscriptionId, type },
    actions: [{ label: 'View Subscription', url: `/subscriptions/${subscriptionId}`, type: 'navigate' }],
  });
};