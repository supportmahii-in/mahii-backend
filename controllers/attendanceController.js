const Subscription = require('../models/Subscription');
const Shop = require('../models/Shop');
const Notification = require('../models/Notification');
const QRCode = require('qrcode');
const crypto = require('crypto');

// @desc    Generate QR code for attendance
// @route   GET /api/attendance/qr/:subscriptionId
// @access  Private
exports.generateQRCode = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.subscriptionId,
      userId: req.user.id,
      isActive: true,
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found',
      });
    }
    
    // Generate unique token for today
    const today = new Date().toDateString();
    const token = crypto
      .createHash('sha256')
      .update(`${subscription._id}-${today}-${process.env.JWT_SECRET}`)
      .digest('hex');
    
    const qrData = JSON.stringify({
      subscriptionId: subscription._id,
      shopId: subscription.shopId,
      token,
      date: today,
    });
    
    const qrCode = await QRCode.toDataURL(qrData);
    
    res.status(200).json({
      success: true,
      qrCode,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark attendance via QR scan
// @route   POST /api/attendance/scan
// @access  Private (Shop Owner)
exports.scanAttendance = async (req, res) => {
  try {
    const { qrData, mealType } = req.body;
    const { subscriptionId, token, date } = JSON.parse(qrData);
    
    // Verify token
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${subscriptionId}-${date}-${process.env.JWT_SECRET}`)
      .digest('hex');
    
    if (token !== expectedToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code',
      });
    }
    
    // Check if date is today
    if (date !== new Date().toDateString()) {
      return res.status(400).json({
        success: false,
        message: 'QR code expired',
      });
    }
    
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }
    
    // Check if already marked
    const alreadyMarked = subscription.attendance.some(
      a => a.date.toDateString() === date && a.mealType === mealType
    );
    
    if (alreadyMarked) {
      return res.status(400).json({
        success: false,
        message: `Attendance already marked for ${mealType}`,
      });
    }
    
    // Mark attendance
    subscription.attendance.push({
      date: new Date(),
      mealType,
      status: 'present',
      markedBy: 'qr',
      markedAt: new Date(),
    });
    
    subscription.mealsConsumed += 1;
    subscription.mealsRemaining -= 1;
    await subscription.save();
    
    // Create notification for customer
    await Notification.create({
      userId: subscription.userId,
      title: 'Attendance Marked',
      message: `Your ${mealType} attendance has been marked for today.`,
      type: 'attendance',
      data: { subscriptionId, mealType },
    });
    
    res.status(200).json({
      success: true,
      message: `Attendance marked for ${mealType}`,
      mealsRemaining: subscription.mealsRemaining,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Manual attendance marking (Shop Owner)
// @route   POST /api/attendance/manual
// @access  Private (Shop Owner)
exports.markManualAttendance = async (req, res) => {
  try {
    const { subscriptionId, mealType, customerId } = req.body;
    
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      shopId: { $in: await Shop.find({ ownerId: req.user.id }).distinct('_id') },
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }
    
    const today = new Date().toDateString();
    const alreadyMarked = subscription.attendance.some(
      a => a.date.toDateString() === today && a.mealType === mealType
    );
    
    if (alreadyMarked) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked',
      });
    }
    
    subscription.attendance.push({
      date: new Date(),
      mealType,
      status: 'present',
      markedBy: 'shopkeeper',
      markedAt: new Date(),
    });
    
    subscription.mealsConsumed += 1;
    subscription.mealsRemaining -= 1;
    await subscription.save();
    
    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      subscription: {
        mealsConsumed: subscription.mealsConsumed,
        mealsRemaining: subscription.mealsRemaining,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};