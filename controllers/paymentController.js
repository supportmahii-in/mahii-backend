const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const razorpay = require('../services/razorpayService');

// @desc    Create Razorpay order for regular food order
// @route   POST /api/payments/create-order
// @access  Private
exports.createOrderPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.createOrder(order.total);

    // Save payment record
    const payment = await Payment.create({
      userId: req.user.id,
      orderId: order._id,
      amount: order.total,
      paymentMethod: 'razorpay',
      paymentType: 'order',
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      amount: order.total,
      currency: 'INR',
      paymentId: payment._id,
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

// @desc    Verify payment after success
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
      subscriptionId,
    } = req.body;

    // Verify signature
    const isValid = razorpay.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Update payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (payment) {
      payment.status = 'success';
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      await payment.save();
    }

    // Update order if this is an order payment
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.orderStatus = 'confirmed';
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();
      }
    }

    // Update subscription if this is a subscription payment
    if (subscriptionId) {
      const subscription = await Subscription.findById(subscriptionId);
      if (subscription) {
        subscription.isActive = true;
        subscription.razorpayPaymentId = razorpay_payment_id;
        subscription.lastPaymentDate = new Date();
        await subscription.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: payment?._id,
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

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .populate('orderId', 'orderStatus total')
      .populate('subscriptionId', 'planName planType')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
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

// @desc    Get payment details by ID
// @route   GET /api/payments/:id
// @access  Private
exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('orderId')
      .populate('subscriptionId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check authorization
    if (payment.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.status(200).json({
      success: true,
      payment,
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

// @desc    Generate invoice
// @route   GET /api/payments/:id/invoice
// @access  Private
exports.generateInvoice = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'name email phone address')
      .populate('orderId')
      .populate('subscriptionId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Generate invoice data
    const invoice = {
      invoiceNumber: `INV-${payment._id.toString().slice(-8).toUpperCase()}`,
      date: payment.createdAt,
      customer: {
        name: payment.userId.name,
        email: payment.userId.email,
        phone: payment.userId.phone,
      },
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentId: payment.razorpayPaymentId,
      status: payment.status,
      items: [],
    };

    if (payment.paymentType === 'order' && payment.orderId) {
      invoice.items = payment.orderId.items;
      invoice.type = 'Food Order';
    } else if (payment.paymentType === 'subscription' && payment.subscriptionId) {
      invoice.items = [{
        name: `${payment.subscriptionId.planName} Subscription`,
        quantity: 1,
        price: payment.amount,
      }];
      invoice.type = 'Mess Subscription';
    }

    res.status(200).json({
      success: true,
      invoice,
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