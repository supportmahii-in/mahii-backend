const express = require('express');
const router = express.Router();
const {
  getProductsByShop,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/shop/:shopId', getProductsByShop);
router.get('/search', searchProducts);
router.get('/:id', getProductById);

// Private routes (Shop Owner only)
router.post('/', protect, authorize('shopowner'), createProduct);
router.put('/:id', protect, authorize('shopowner'), updateProduct);
router.delete('/:id', protect, authorize('shopowner'), deleteProduct);

module.exports = router;