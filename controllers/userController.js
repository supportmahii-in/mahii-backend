const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalOrders = await Order.countDocuments({
      userId,
      orderStatus: { $ne: 'cancelled' }
    });

    const activeSubscriptions = await Subscription.countDocuments({
      userId,
      isActive: true,
      endDate: { $gte: new Date() }
    });

    const savingsData = await Order.aggregate([
      { $match: { userId: req.user._id, discount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$discount' } } }
    ]);

    const totalSaved = savingsData[0]?.total || 0;

    res.json({
      success: true,
      totalOrders,
      activeSubscriptions,
      totalSaved
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      notifications: user.notificationSettings || {
        emailNotifications: true,
        pushNotifications: true,
        orderUpdates: true,
        promotionalEmails: false,
        smsAlerts: true,
      },
      privacy: user.privacySettings || {
        showProfile: true,
        showEmail: false,
        showPhone: false,
        showOrderHistory: true,
      },
      language: user.language || 'en',
      currency: user.currency || 'INR',
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, bio } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.bio = bio || user.bio;
    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordMatch = await user.matchPassword(currentPassword);
    if (!passwordMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateNotificationSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.notificationSettings = {
      ...user.notificationSettings,
      ...req.body,
    };
    await user.save();

    res.json({ success: true, notifications: user.notificationSettings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updatePrivacySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.privacySettings = {
      ...user.privacySettings,
      ...req.body,
    };
    await user.save();

    res.json({ success: true, privacy: user.privacySettings });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
