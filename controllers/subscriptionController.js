const Subscription = require('../models/Subscription');
const Shop = require('../models/Shop');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const razorpay = require('../services/razorpayService');

// @desc    Get available subscription plans for a mess
// @route   GET /api/subscriptions/plans/:shopId
// @access  Public
exports.getPlans = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    // Predefined plans based on shop
    const plans = [
      {
        name: 'Weekly Plan',
        type: 'weekly',
        duration: 7,
        mealsPerDay: 2,
        totalMeals: 14,
        price: 700,
        savings: '10%',
      },
      {
        name: 'Monthly Plan',
        type: 'monthly',
        duration: 30,
        mealsPerDay: 2,
        totalMeals: 60,
        price: 2500,
        savings: '20%',
      },
      {
        name: 'Quarterly Plan',
        type: 'quarterly',
        duration: 90,
        mealsPerDay: 2,
        totalMeals: 180,
        price: 7000,
        savings: '30%',
      },
    ];

    res.status(200).json({
      success: true,
      count: plans.length,
      plans,
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

// @desc    Create new subscription
// @route   POST /api/subscriptions/create
// @access  Private (Customer)
exports.createSubscription = async (req, res) => {
  try {
    const { shopId, planType, planName, price, mealsPerDay, totalMeals, autoRenew, startDate } = req.body;

    // Check if user already has active subscription for this shop
    const existingSubscription = await Subscription.findOne({
      userId: req.user.id,
      shopId,
      isActive: true,
      endDate: { $gt: new Date() },
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription for this mess',
      });
    }

    // Verify shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    // Calculate dates
    const start = new Date(startDate);
    let endDate = new Date(start);
    
    switch (planType) {
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create Razorpay Order for payment
    const razorpayOrder = await razorpay.createOrder(price, 'INR');

    // Create subscription (inactive until payment is verified)
    const subscription = await Subscription.create({
      userId: req.user.id,
      shopId,
      planType,
      planName,
      price,
      mealsPerDay,
      totalMeals,
      mealsRemaining: totalMeals,
      autoRenew: autoRenew || false,
      startDate: start,
      endDate,
      isActive: false,
      razorpayOrderId: razorpayOrder.id,
    });

    // Notify shop owner of the new subscription request
    await Notification.create({
      userId: shop.ownerId,
      title: 'New Mess Subscription Request',
      message: `${req.user.name} has created a subscription request for ${shop.name}.`,
      type: 'subscription',
      priority: 'high',
      data: {
        subscriptionId: subscription._id,
        shopId: shop._id,
        customerId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created. Complete payment to activate.',
      subscription: {
        id: subscription._id,
        planName: subscription.planName,
        price: subscription.price,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        razorpayOrderId: razorpayOrder.id,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
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

// @desc    Activate subscription after payment
// @route   POST /api/subscriptions/activate/:id
// @access  Private
exports.activateSubscription = async (req, res) => {
  try {
    const { paymentId, razorpayOrderId, signature } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Verify payment with Razorpay
    const isValid = razorpay.verifyPayment(razorpayOrderId, paymentId, signature);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Update subscription
    subscription.isActive = true;
    subscription.razorpayPaymentId = paymentId;
    subscription.lastPaymentDate = new Date();
    subscription.nextPaymentDate = subscription.endDate;
    
    await subscription.save();

    // Record payment
    await Payment.create({
      userId: req.user.id,
      subscriptionId: subscription._id,
      amount: subscription.price,
      paymentMethod: 'razorpay',
      paymentType: 'subscription',
      status: 'success',
      razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    });

    const shop = await Shop.findById(subscription.shopId);
    const shopOwnerId = shop?.ownerId;

    if (shopOwnerId) {
      await Notification.create({
        userId: shopOwnerId,
        title: 'Subscription Activated',
        message: `Subscription for ${subscription.planName} on ${shop.name} is now active.`,
        type: 'subscription',
        priority: 'medium',
        data: {
          subscriptionId: subscription._id,
          shopId: subscription.shopId,
        },
      });
    }

    // Notify customer of successful activation
    await Notification.create({
      userId: req.user.id,
      title: 'Subscription Activated',
      message: `Your ${subscription.planName} subscription is now active. Enjoy your meals!`,
      type: 'subscription',
      priority: 'medium',
      data: {
        subscriptionId: subscription._id,
        shopId: subscription.shopId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Subscription activated successfully!',
      subscription,
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

// @desc    Get my subscriptions (Customer)
// @route   GET /api/subscriptions/my
// @access  Private
exports.getMySubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user.id })
      .populate('shopId', 'name location images rating')
      .sort({ createdAt: -1 });

    // Add active status
    const now = new Date();
    const enrichedSubscriptions = subscriptions.map(sub => ({
      ...sub._doc,
      isExpired: new Date(sub.endDate) < now,
      daysRemaining: Math.ceil((new Date(sub.endDate) - now) / (1000 * 60 * 60 * 24)),
    }));

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      subscriptions: enrichedSubscriptions,
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

// @desc    Mark attendance (QR/Manual)
// @route   POST /api/subscriptions/attendance
// @access  Private
exports.markAttendance = async (req, res) => {
  try {
    const { subscriptionId, mealType, qrCode, method = 'qr' } = req.body;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: req.user.id,
      isActive: true,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found',
      });
    }

    // Check if already marked for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alreadyMarked = subscription.attendance.find(
      a => a.date.toDateString() === today.toDateString() && a.mealType === mealType
    );

    if (alreadyMarked) {
      return res.status(400).json({
        success: false,
        message: `Attendance already marked for ${mealType} today`,
      });
    }

    // Check if meals remaining
    if (subscription.mealsRemaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No meals remaining in your subscription',
      });
    }

    // Mark attendance
    subscription.attendance.push({
      date: today,
      mealType,
      status: 'present',
      markedBy: method === 'qr' ? 'qr' : 'user',
      markedAt: new Date(),
      qrCode: qrCode || null,
    });

    subscription.mealsConsumed += 1;
    subscription.mealsRemaining -= 1;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: `Attendance marked for ${mealType}`,
      mealsRemaining: subscription.mealsRemaining,
      mealsConsumed: subscription.mealsConsumed,
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

// @desc    Get attendance history
// @route   GET /api/subscriptions/attendance/:subscriptionId
// @access  Private
exports.getAttendanceHistory = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Check authorization
    if (subscription.userId.toString() !== req.user.id && req.user.role !== 'shopowner') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Group attendance by date
    const attendanceByDate = {};
    subscription.attendance.forEach(att => {
      const dateKey = att.date.toDateString();
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = {};
      }
      attendanceByDate[dateKey][att.mealType] = att.status;
    });

    res.status(200).json({
      success: true,
      totalMeals: subscription.totalMeals,
      mealsConsumed: subscription.mealsConsumed,
      mealsRemaining: subscription.mealsRemaining,
      attendanceHistory: subscription.attendance,
      attendanceByDate,
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

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/:id/cancel
// @access  Private
exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Check authorization
    if (subscription.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    subscription.isActive = false;
    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || 'User requested cancellation';

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription,
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

// @desc    Close an expired or completed subscription (Shop Owner)
// @route   PUT /api/subscriptions/:id/close
// @access  Private (Shop Owner only)
exports.closeSubscriptionByOwner = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    const shop = await Shop.findOne({ _id: subscription.shopId, ownerId: req.user.id });
    if (!shop) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this subscription',
      });
    }

    subscription.isActive = false;
    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = req.body.reason || 'Closed by shop owner';

    await subscription.save();

    await Notification.create({
      userId: subscription.userId,
      title: 'Subscription Closed',
      message: `Your subscription for ${shop.name} has been closed by the shop owner.`,
      type: 'subscription',
      priority: 'medium',
      data: {
        subscriptionId: subscription._id,
        shopId: shop._id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Subscription closed successfully',
      subscription,
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

// @desc    Get shop subscriptions (Shop Owner)
// @route   GET /api/subscriptions/shop/:shopId
// @access  Private (Shop Owner only)
exports.getShopSubscriptions = async (req, res) => {
  try {
    const { shopId } = req.params;

    const subscriptions = await Subscription.find({ shopId })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
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