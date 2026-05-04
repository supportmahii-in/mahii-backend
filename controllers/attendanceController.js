const Attendance = require('../models/Attendance');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const Shop = require('../models/Shop');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Student marks attendance
exports.markAttendance = async (req, res) => {
  try {
    const { subscriptionId, mealType, method = 'student' } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already marked
    const existing = await Attendance.findOne({
      subscriptionId,
      date: today,
      mealType,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${mealType} attendance already marked for today`,
      });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription || !subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    const attendance = await Attendance.create({
      subscriptionId,
      userId: req.user.id,
      shopId: subscription.shopId,
      date: today,
      mealType,
      status: 'present',
      markedBy: method,
    });

    // Update subscription meals consumed
    subscription.mealsConsumed += 1;
    subscription.mealsRemaining -= 1;
    await subscription.save();

    // Notify shop owner
    const shop = await Shop.findById(subscription.shopId);
    await Notification.create({
      userId: shop.ownerId,
      title: '🎯 Meal Attendance Marked',
      message: `${req.user.name} marked ${mealType} attendance`,
      type: 'attendance',
      data: { subscriptionId, mealType, studentName: req.user.name },
    });

    res.status(200).json({
      success: true,
      message: `${mealType} attendance marked successfully`,
      attendance,
      mealsRemaining: subscription.mealsRemaining,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance analytics for shop owner
exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const { shopId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all subscriptions for this shop
    const subscriptions = await Subscription.find({ shopId, isActive: true });
    const studentIds = subscriptions.map(s => s.userId);

    // Get attendance records
    const attendance = await Attendance.find({
      shopId,
      date: { $gte: startDate },
    }).populate('userId', 'name');

    // Daily attendance count
    const dailyData = {};
    attendance.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
      }
      dailyData[dateStr][record.mealType]++;
      dailyData[dateStr].total++;
    });

    // Meal distribution
    const mealDistribution = {
      breakfast: attendance.filter(a => a.mealType === 'breakfast').length,
      lunch: attendance.filter(a => a.mealType === 'lunch').length,
      dinner: attendance.filter(a => a.mealType === 'dinner').length,
    };

    // Student-wise attendance
    const studentAttendance = {};
    attendance.forEach(record => {
      const studentId = record.userId._id;
      if (!studentAttendance[studentId]) {
        studentAttendance[studentId] = {
          name: record.userId.name,
          total: 0,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
        };
      }
      studentAttendance[studentId].total++;
      studentAttendance[studentId][record.mealType]++;
    });

    const attendanceRate = subscriptions.length > 0
      ? (attendance.length / (subscriptions.length * 3 * parseInt(days))) * 100
      : 0;

    res.status(200).json({
      success: true,
      analytics: {
        dailyData: Object.entries(dailyData).map(([date, data]) => ({ date, ...data })),
        mealDistribution,
        studentAttendance: Object.values(studentAttendance).sort((a, b) => b.total - a.total),
        totalStudents: subscriptions.length,
        totalAttendance: attendance.length,
        attendanceRate: attendanceRate.toFixed(1),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get student's attendance history
exports.getMyAttendance = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const attendance = await Attendance.find({ subscriptionId })
      .sort({ date: -1 })
      .limit(30);

    // Calculate streak
    let streak = 0;
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];

    attendance.forEach(record => {
      const recordDate = record.date.toISOString().split('T')[0];
      if (recordDate === today) currentStreak++;
    });

    res.status(200).json({
      success: true,
      attendance,
      streak: currentStreak,
      totalMeals: attendance.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance for a specific date range
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { shopId, startDate, endDate } = req.query;

    const attendance = await Attendance.find({
      shopId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).populate('userId', 'name').populate('subscriptionId', 'planName');

    res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate QR code for attendance
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

// Mark attendance via QR scan
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already marked
    const existing = await Attendance.findOne({
      subscriptionId,
      date: today,
      mealType,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Attendance already marked for ${mealType}`,
      });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    const attendance = await Attendance.create({
      subscriptionId,
      userId: subscription.userId,
      shopId: subscription.shopId,
      date: today,
      mealType,
      status: 'present',
      markedBy: 'qr',
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