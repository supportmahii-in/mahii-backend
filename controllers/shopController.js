const Shop = require('../models/Shop');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ==================== SHOP OWNER FUNCTIONS ====================

// @desc    Register new shop (Shop Owner)
// @route   POST /api/shops
// @access  Private (Shop Owner only)
exports.registerShop = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      location,
      contactNumber,
      costForTwo,
      timings,
      pureVeg,
    } = req.body;

    const existingShop = await Shop.findOne({ ownerId: req.user.id });
    if (existingShop) {
      return res.status(400).json({
        success: false,
        message: 'You already have a registered shop. Only one shop per owner is allowed.',
      });
    }

    const shop = await Shop.create({
      name,
      ownerId: req.user.id,
      category,
      description,
      location,
      contactNumber,
      costForTwo: costForTwo || 300,
      timings: timings || { open: '09:00', close: '22:00', isOpen: true },
      pureVeg: pureVeg || false,
      isActive: false,
      isApproved: false,
    });

    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Shop Registration',
        message: `${shop.name} has registered and is awaiting approval.`,
        type: 'admin',
        data: { shopId: shop._id, shopName: shop.name },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Shop registered successfully! Waiting for admin approval.',
      shop: {
        id: shop._id,
        name: shop.name,
        status: 'pending_approval',
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

// @desc    Get shop owner's shop status
// @route   GET /api/shops/my-shop
// @access  Private (Shop Owner)
exports.getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ ownerId: req.user.id });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'No shop found',
      });
    }

    res.status(200).json({
      success: true,
      shop,
      status: {
        isActive: shop.isActive,
        isApproved: shop.isApproved,
        message: shop.isActive ? 'Shop is live on explore page' : 'Shop pending approval',
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

// ==================== CUSTOMER EXPLORE FUNCTIONS ====================

// @desc    Get all shops for explore page (with filters & pagination)
// @route   GET /api/shops/explore
// @access  Public
exports.getExploreShops = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      lat,
      lng,
      radius = 10,
      category,
      city,
      pureVeg,
      minRating,
      maxCost,
      minCost,
      isOpenNow,
      search,
      sortBy = 'rating',
    } = req.query;

    let query = { isActive: true, isApproved: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (pureVeg === 'true') {
      query.pureVeg = true;
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    if (minCost || maxCost) {
      query.costForTwo = {};
      if (minCost) query.costForTwo.$gte = parseInt(minCost, 10);
      if (maxCost) query.costForTwo.$lte = parseInt(maxCost, 10);
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (isOpenNow === 'true') {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      query.$or = [
        { 'timings.isOpen': true },
        {
          'timings.open': { $lte: currentTime },
          'timings.close': { $gte: currentTime },
        },
      ];
    }

    let shops = await Shop.find(query)
      .select('name category location rating reviewCount costForTwo timings pureVeg logo coverImage images popularityScore createdAt')
      .lean();

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      shops = shops.map(shop => ({
        ...shop,
        distance: calculateDistance(userLat, userLng, shop.location.lat, shop.location.lng),
      }));

      shops = shops.filter(shop => shop.distance <= parseFloat(radius));
    }

    shops = sortShops(shops, sortBy);

    const total = shops.length;
    const startIndex = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const endIndex = startIndex + parseInt(limit, 10);
    const paginatedShops = shops.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      shops: paginatedShops,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        limit: parseInt(limit, 10),
      },
      filters: {
        category,
        pureVeg: pureVeg === 'true',
        minRating: minRating ? parseFloat(minRating) : null,
        minCost: minCost ? parseInt(minCost, 10) : null,
        maxCost: maxCost ? parseInt(maxCost, 10) : null,
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

// @desc    Get single shop details
// @route   GET /api/shops/:id
// @access  Public
exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      _id: req.params.id,
      isActive: true,
      isApproved: true,
    }).populate('ownerId', 'name email phone');

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    shop.viewCount = (shop.viewCount || 0) + 1;
    await shop.save();

    res.status(200).json({
      success: true,
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

// @desc    Get shop categories with counts
// @route   GET /api/shops/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Shop.aggregate([
      { $match: { isActive: true, isApproved: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const categoryMap = {
      mess: 'Mess / Tiffin Service',
      hotel: 'Hotel / Restaurant',
      cafe: 'Caf� / Coffee Shop',
      dessert: 'Dessert / Bakery',
      stall: 'Food Stall / Kiosk',
    };

    const formattedCategories = categories.map(cat => ({
      id: cat._id,
      name: categoryMap[cat._id] || cat._id,
      count: cat.count,
      icon: getCategoryIcon(cat._id),
    }));

    res.status(200).json({
      success: true,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get active shops for public listing
// @route   GET /api/shops
// @access  Public
exports.getShops = async (req, res) => {
  try {
    const { category, city, search } = req.query;
    let query = { isActive: true, isApproved: true };

    if (category) query.category = category;
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const shops = await Shop.find(query)
      .populate('ownerId', 'name email phone')
      .sort({ rating: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: shops.length,
      shops,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get nearby shops (Public - Only active shops)
// @route   GET /api/shops/nearby
// @access  Public
exports.getNearbyShops = async (req, res) => {
  try {
    const { lat, lng, radius = 10, category, minRating, pureVeg } = req.query;
    let query = { isActive: true, isApproved: true };

    if (category) query.category = category;
    if (pureVeg === 'true') query.pureVeg = true;
    if (minRating) query.rating = { $gte: parseFloat(minRating) };

    let shops = await Shop.find(query).sort({ rating: -1 }).lean();

    if (lat && lng) {
      shops = shops.map(shop => ({
        ...shop,
        distance: calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          shop.location.lat,
          shop.location.lng
        ),
      }));
      shops.sort((a, b) => a.distance - b.distance);
      shops = shops.filter(shop => shop.distance <= parseFloat(radius));
    }

    res.status(200).json({
      success: true,
      count: shops.length,
      shops,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get my shops (Shop Owner)
// @route   GET /api/shops/my
// @access  Private (Shop Owner only)
exports.getMyShops = async (req, res) => {
  try {
    const shops = await Shop.find({ ownerId: req.user.id });
    res.status(200).json({
      success: true,
      shops,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update shop details (After approval)
// @route   PUT /api/shops/:id
// @access  Private (Shop Owner)
exports.updateShop = async (req, res) => {
  try {
    let shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    if (shop.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Shop owners can update their details anytime (pending or approved)
    // Only prevent updates if being manually rejected
    if (!shop.isActive && shop.approvalStatus === 'rejected' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Your shop was rejected. Please contact admin support.',
      });
    }

    // Prevent updating immutable fields
    const updates = { ...req.body };
    delete updates.ownerId;
    delete updates._id;
    delete updates.isActive;
    delete updates.isApproved;
    delete updates.pendingEdits;
    delete updates.hasPendingEdits;

    // Handle location updates - merge with existing to preserve required fields
    if (updates.location && typeof updates.location === 'object') {
      updates.location = {
        city: updates.location.city || shop.location?.city,
        area: updates.location.area || shop.location?.area,
        address: updates.location.address || shop.location?.address,
        lat: updates.location.lat !== undefined ? updates.location.lat : shop.location?.lat,
        lng: updates.location.lng !== undefined ? updates.location.lng : shop.location?.lng,
      };
    } else if (updates.location === null) {
      // Prevent deletion of location
      delete updates.location;
    }

    // Handle timings updates - merge with existing
    if (updates.timings && typeof updates.timings === 'object') {
      updates.timings = {
        open: updates.timings.open || shop.timings?.open,
        close: updates.timings.close || shop.timings?.close,
      };
    } else if (updates.timings === null) {
      delete updates.timings;
    }

    shop = await Shop.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Shop updated successfully',
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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function sortShops(shops, sortBy) {
  switch (sortBy) {
    case 'distance':
      return shops.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    case 'cost_low':
      return shops.sort((a, b) => a.costForTwo - b.costForTwo);
    case 'cost_high':
      return shops.sort((a, b) => b.costForTwo - a.costForTwo);
    case 'popularity':
      return shops.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    case 'newest':
      return shops.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'rating':
    default:
      return shops.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
}

function getCategoryIcon(category) {
  const icons = {
    mess: '??',
    hotel: '??',
    cafe: '?',
    dessert: '??',
    stall: '??',
  };
  return icons[category] || '???';
}

// ==================== SHOP EDIT APPROVAL WORKFLOW ====================

// @desc    Submit shop edits for admin approval
// @route   POST /api/shops/:id/submit-edit
// @access  Private (Shop Owner)
exports.submitEditForApproval = async (req, res) => {
  try {
    let shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    if (shop.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this shop',
      });
    }

    // Store the pending edits - only changes that are actually being submitted
    let editChanges = req.body;

    // Validate that we're not trying to change immutable fields
    if (editChanges.ownerId || editChanges._id || editChanges.isActive || editChanges.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify immutable fields',
      });
    }

    // If location is being edited, ensure all required fields are present
    if (editChanges.location && typeof editChanges.location === 'object') {
      const { city, area, address, lat, lng } = editChanges.location;
      if (!city || !area || !address || lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Location must include: city, area, address, lat, lng',
        });
      }
    }

    shop.pendingEdits = editChanges;
    shop.hasPendingEdits = true;
    shop.editSubmittedAt = new Date();

    // Add to edit history
    shop.editEditHistory = shop.editEditHistory || [];
    shop.editEditHistory.push({
      submittedAt: new Date(),
      submittedBy: req.user.id,
      changes: editChanges,
      status: 'pending',
    });

    await shop.save();

    // Notify admins about pending edit
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'Shop Edit Pending Approval',
        message: `${shop.name} has submitted changes for approval.`,
        type: 'shop_edit',
        relatedId: shop._id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Shop edits submitted for approval',
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

// @desc    Get shop edit history for owner
// @route   GET /api/shops/:id/edit-history
// @access  Private (Shop Owner)
exports.getEditHistory = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate('editEditHistory.submittedBy', 'name email')
      .populate('editEditHistory.reviewedBy', 'name email');

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    if (shop.ownerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.status(200).json({
      success: true,
      editHistory: shop.editEditHistory || [],
      pendingEdits: shop.pendingEdits,
      hasPendingEdits: shop.hasPendingEdits,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================== ADMIN FUNCTIONS ====================

// @desc    Get all shops with pending edits
// @route   GET /api/admin/pending-shop-edits
// @access  Private (Admin)
exports.getPendingShopEdits = async (req, res) => {
  try {
    const shops = await Shop.find({ hasPendingEdits: true })
      .populate('ownerId', 'name email')
      .populate('editEditHistory.submittedBy', 'name email')
      .select('-editEditHistory');

    res.status(200).json({
      success: true,
      count: shops.length,
      shops,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Approve shop edit
// @route   POST /api/admin/shops/:id/approve-edit
// @access  Private (Admin)
exports.approveShopEdit = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    let shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    if (!shop.hasPendingEdits || !shop.pendingEdits) {
      return res.status(400).json({
        success: false,
        message: 'No pending edits for this shop',
      });
    }

    // Build a clean update object that merges safely
    const updates = {};
    const pendingEdits = shop.pendingEdits;

    // Process each pending edit
    Object.keys(pendingEdits).forEach(key => {
      // Skip immutable fields
      if (key === '_id' || key === 'ownerId' || key === 'isApproved' || key === 'isActive') {
        return;
      }

      // For nested objects, merge carefully
      if (key === 'location' && typeof pendingEdits[key] === 'object') {
        // Merge location with existing, make sure all required fields present
        updates.location = {
          city: pendingEdits[key]?.city !== undefined ? pendingEdits[key].city : shop.location?.city,
          area: pendingEdits[key]?.area !== undefined ? pendingEdits[key].area : shop.location?.area,
          address: pendingEdits[key]?.address !== undefined ? pendingEdits[key].address : shop.location?.address,
          lat: pendingEdits[key]?.lat !== undefined ? pendingEdits[key].lat : shop.location?.lat,
          lng: pendingEdits[key]?.lng !== undefined ? pendingEdits[key].lng : shop.location?.lng,
        };
      } else if (key === 'timings' && typeof pendingEdits[key] === 'object') {
        updates.timings = {
          open: pendingEdits[key]?.open || shop.timings?.open,
          close: pendingEdits[key]?.close || shop.timings?.close,
        };
      } else if (key === 'facilities' && Array.isArray(pendingEdits[key])) {
        updates[key] = pendingEdits[key];
      } else if (pendingEdits[key] !== null && pendingEdits[key] !== undefined) {
        updates[key] = pendingEdits[key];
      }
    });

    // Apply the clean updates
    Object.keys(updates).forEach(key => {
      shop[key] = updates[key];
    });

    // Final validation - ensure location is complete
    if (!shop.location || !shop.location.city || !shop.location.area || !shop.location.lat || !shop.location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Location data is incomplete. Cannot approve edits.',
      });
    }

    // Update edit history
    const lastEdit = shop.editEditHistory[shop.editEditHistory.length - 1];
    if (lastEdit && lastEdit.status === 'pending') {
      lastEdit.status = 'approved';
      lastEdit.reviewedAt = new Date();
      lastEdit.reviewedBy = req.user.id;
      lastEdit.adminNotes = adminNotes || '';
    }

    // Clear pending edits
    shop.pendingEdits = null;
    shop.hasPendingEdits = false;

    await shop.save();

    // Notify shop owner
    await Notification.create({
      userId: shop.ownerId,
      title: 'Shop Edit Approved',
      message: `Your changes to ${shop.name} have been approved and are now live.`,
      type: 'shop_edit_approved',
      relatedId: shop._id,
    });

    res.status(200).json({
      success: true,
      message: 'Shop edits approved and applied',
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

// @desc    Reject shop edit
// @route   POST /api/admin/shops/:id/reject-edit
// @access  Private (Admin)
exports.rejectShopEdit = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    let shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    if (!shop.hasPendingEdits) {
      return res.status(400).json({
        success: false,
        message: 'No pending edits for this shop',
      });
    }

    // Update edit history
    const lastEdit = shop.editEditHistory[shop.editEditHistory.length - 1];
    if (lastEdit && lastEdit.status === 'pending') {
      lastEdit.status = 'rejected';
      lastEdit.reviewedAt = new Date();
      lastEdit.reviewedBy = req.user.id;
      lastEdit.adminNotes = rejectionReason;
    }

    // Clear pending edits
    shop.pendingEdits = null;
    shop.hasPendingEdits = false;

    await shop.save();

    // Notify shop owner
    await Notification.create({
      userId: shop.ownerId,
      title: 'Shop Edit Rejected',
      message: `Your changes to ${shop.name} were rejected. Reason: ${rejectionReason}`,
      type: 'shop_edit_rejected',
      relatedId: shop._id,
    });

    res.status(200).json({
      success: true,
      message: 'Shop edits rejected',
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

// @desc    Search shops by name, description, or location
// @route   GET /api/shops/search
// @access  Public
exports.searchShops = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const shops = await Shop.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'location.area': { $regex: q, $options: 'i' } },
        { 'location.city': { $regex: q, $options: 'i' } }
      ]
    })
    .select('name category location rating coverImage')
    .limit(parseInt(limit))
    .sort({ rating: -1 });
    
    res.status(200).json({
      success: true,
      count: shops.length,
      shops
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
