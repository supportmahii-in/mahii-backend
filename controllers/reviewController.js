const Review = require('../models/Review');
const Shop = require('../models/Shop');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Add review
// @route   POST /api/reviews
// @access  Private (Customer)
exports.addReview = async (req, res) => {
  try {
    const { shopId, rating, comment, images } = req.body;
    
    // Check if user already reviewed this shop
    const existingReview = await Review.findOne({ userId: req.user.id, shopId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this shop',
      });
    }
    
    const review = await Review.create({
      userId: req.user.id,
      shopId,
      rating,
      comment,
      images,
    });
    
    // Update shop rating
    const reviews = await Review.find({ shopId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Shop.findByIdAndUpdate(shopId, {
      rating: avgRating.toFixed(1),
      reviewCount: reviews.length,
    });
    
    // Notify shop owner
    const shop = await Shop.findById(shopId);
    await Notification.create({
      userId: shop.ownerId,
      title: 'New Review',
      message: `${req.user.name} rated your shop ${rating} stars`,
      type: 'review',
      data: { reviewId: review._id, rating },
    });
    
    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get shop reviews
// @route   GET /api/reviews/shop/:shopId
// @access  Public
exports.getShopReviews = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const reviews = await Review.find({ shopId, isVisible: true })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Review.countDocuments({ shopId, isVisible: true });
    
    res.status(200).json({
      success: true,
      reviews,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reply to review (Shop Owner)
// @route   POST /api/reviews/:id/reply
// @access  Private (Shop Owner)
exports.replyToReview = async (req, res) => {
  try {
    const { reply } = req.body;
    const review = await Review.findById(req.params.id).populate('shopId');
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    
    // Check if shop belongs to this owner
    const shop = await Shop.findOne({ _id: review.shopId, ownerId: req.user.id });
    if (!shop && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }
    
    review.reply = {
      text: reply,
      repliedAt: new Date(),
      repliedBy: req.user.id,
    };
    await review.save();
    
    // Notify customer
    await Notification.create({
      userId: review.userId,
      title: 'Shop Replied to Your Review',
      message: `The owner of ${shop.name} replied to your review`,
      type: 'review',
      data: { reviewId: review._id },
    });
    
    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete review (Admin only - for inappropriate content)
// @route   DELETE /api/reviews/:id
// @access  Private (Admin only)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    
    await review.deleteOne();
    
    // Update shop rating
    const reviews = await Review.find({ shopId: review.shopId });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    await Shop.findByIdAndUpdate(review.shopId, {
      rating: avgRating.toFixed(1),
      reviewCount: reviews.length,
    });
    
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Report inappropriate review (Customer)
// @route   POST /api/reviews/:id/report
// @access  Private
exports.reportReview = async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    
    review.reports = review.reports || [];
    review.reports.push({
      userId: req.user.id,
      reason,
      reportedAt: new Date(),
    });
    
    await review.save();
    
    // Notify admin
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'Review Reported',
        message: `A review has been reported for: ${reason}`,
        type: 'admin',
        data: { reviewId: review._id },
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Review reported successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};