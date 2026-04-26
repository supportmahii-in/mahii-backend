const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Notification = require('../models/Notification');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Customer)
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      shopId,
      deliveryAddress,
      specialInstructions,
      paymentMethod = 'razorpay',
    } = req.body;

    // Validate items and calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`,
        });
      }

      let itemTotal = product.price * item.quantity;
      
      // Add customization costs
      let customizationTotal = 0;
      if (item.customization) {
        customizationTotal = item.customization.reduce((sum, opt) => sum + opt.price, 0);
        itemTotal += customizationTotal * item.quantity;
      }

      subtotal += itemTotal;

      processedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        customization: item.customization || [],
        totalPrice: itemTotal,
      });
    }

    // Calculate totals
    const deliveryCharge = 40; // Fixed delivery charge
    const tax = subtotal * 0.05; // 5% GST
    const total = subtotal + deliveryCharge + tax;

    // Create order
    const order = await Order.create({
      userId: req.user.id,
      shopId,
      items: processedItems,
      subtotal,
      deliveryCharge,
      tax,
      total,
      paymentMethod,
      deliveryAddress,
      specialInstructions,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    });

    // Populate order details
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email phone')
      .populate('shopId', 'name location contactNumber');

    // Send real-time notification to shop owner
    const shop = await Shop.findById(shopId);
    const io = req.app.get('io');
    
    if (io) {
      io.to(`shop_${shop.ownerId}`).emit('new_order', {
        orderId: order._id,
        customerName: req.user.name,
        total: order.total,
        timestamp: new Date(),
      });
    }
    
    // Create notification in database
    await Notification.create({
      userId: shop.ownerId,
      title: 'New Order Received!',
      message: `New order #${order._id.toString().slice(-6)} from ${req.user.name}`,
      type: 'order',
      data: { orderId: order._id, amount: order.total },
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder,
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

// @desc    Get my orders (Customer)
// @route   GET /api/orders/my-orders
// @access  Private (Customer)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('shopId', 'name location images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
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

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('shopId', 'name location contactNumber images')
      .populate('items.productId', 'name image veg');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if user is authorized to view this order
    if (order.userId._id.toString() !== req.user.id && 
        req.user.role !== 'shopowner' && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
    }

    res.status(200).json({
      success: true,
      order,
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

// @desc    Update order status (Shop Owner/Admin)
// @route   PUT /api/orders/:id/status
// @access  Private (Shop Owner/Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (req.user.role === 'shopowner') {
      const shop = await Shop.findOne({ _id: order.shopId, ownerId: req.user.id });
      if (!shop) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this order',
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    order.orderStatus = status;
    
    if (status === 'delivered') {
      order.deliveredAt = Date.now();
    }
    if (status === 'cancelled') {
      order.cancelledAt = Date.now();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
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

// @desc    Get shop orders (Shop Owner)
// @route   GET /api/orders/shop/:shopId
// @access  Private (Shop Owner)
exports.getShopOrders = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, startDate, endDate } = req.query;

    // Verify shop ownership
    const shop = await Shop.findOne({ _id: shopId, ownerId: req.user.id });
    if (!shop && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view orders for this shop',
      });
    }

    let query = { shopId };

    if (status) query.orderStatus = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
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