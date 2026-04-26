const Product = require('../models/Product');
const Shop = require('../models/Shop');

// @desc    Get all products for a shop
// @route   GET /api/products/shop/:shopId
// @access  Public
exports.getProductsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { category, isAvailable, veg, minPrice, maxPrice } = req.query;

    let query = { shopId };

    if (category) query.category = category;
    if (isAvailable) query.isAvailable = isAvailable === 'true';
    if (veg) query.veg = veg === 'true';
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const products = await Product.find(query).sort({ isPopular: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products,
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

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('shopId', 'name location rating');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      product,
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

// @desc    Create product (Shop Owner only)
// @route   POST /api/products
// @access  Private (Shop Owner)
exports.createProduct = async (req, res) => {
  try {
    const { shopId, name, price, category, description } = req.body;

    // Verify shop belongs to this shop owner
    const shop = await Shop.findOne({ _id: shopId, ownerId: req.user.id });
    if (!shop) {
      return res.status(403).json({
        success: false,
        message: 'You can only add products to your own shops',
      });
    }

    const product = await Product.create({
      ...req.body,
      shopId,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
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

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Shop Owner)
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify ownership
    const shop = await Shop.findOne({ _id: product.shopId, ownerId: req.user.id });
    if (!shop && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own products',
      });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
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

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Shop Owner)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify ownership
    const shop = await Shop.findOne({ _id: product.shopId, ownerId: req.user.id });
    if (!shop && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own products',
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
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

// @desc    Search products
// @route   GET /api/products/search?q=query
// @access  Public
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search query',
      });
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ],
    }).populate('shopId', 'name location rating');

    res.status(200).json({
      success: true,
      count: products.length,
      products,
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