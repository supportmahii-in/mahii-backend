const express = require('express');
const router = express.Router();
const {
  getNearbyShops,
  getShops,
  getShopById,
  registerShop,
  updateShop,
  getMyShops,
  getMyShop,
  getExploreShops,
  getCategories,
  submitEditForApproval,
  getEditHistory,
  getPendingShopEdits,
  approveShopEdit,
  rejectShopEdit,
  searchShops,
} = require('../controllers/shopController');
const {
  uploadLogo,
  uploadCover,
  uploadGallery,
  deleteImage,
  uploadVideo,
} = require('../controllers/shopMediaController');
const { updateLocation } = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../services/uploadService');

// Public routes
router.get('/', getShops);
router.get('/explore', getExploreShops);
router.get('/categories', getCategories);
router.get('/nearby', getNearbyShops);
router.get('/search', searchShops);

// Private routes (Shop Owner only) - MUST come BEFORE '/:id'
router.get('/my', protect, authorize('shopowner'), getMyShops);
router.get('/my-shop', protect, authorize('shopowner'), getMyShop);
router.put('/location', protect, authorize('shopowner'), updateLocation);

// Admin Routes - Pending Shop Edits - MUST come before /:id routes
router.get('/admin/pending-edits', protect, authorize('admin'), getPendingShopEdits);
router.post('/admin/:id/approve-edit', protect, authorize('admin'), approveShopEdit);
router.post('/admin/:id/reject-edit', protect, authorize('admin'), rejectShopEdit);

// Shop Edit Approval Workflow - MUST come before /media routes
router.post('/:id/submit-edit', protect, authorize('shopowner'), submitEditForApproval);
router.get('/:id/edit-history', protect, authorize('shopowner'), getEditHistory);

// Media routes
router.post('/media/logo', protect, authorize('shopowner'), upload.single('file'), uploadLogo);
router.post('/media/cover', protect, authorize('shopowner'), upload.single('file'), uploadCover);
router.post('/media/gallery', protect, authorize('shopowner'), upload.array('files', 10), uploadGallery);
router.delete('/media/image/:imageId', protect, authorize('shopowner'), deleteImage);
router.post('/media/video', protect, authorize('shopowner'), upload.single('file'), uploadVideo);

// Public route with parameter - MUST come LAST
router.get('/:id', getShopById);
router.post('/', protect, authorize('shopowner'), registerShop);
router.put('/:id', protect, authorize('shopowner'), updateShop);

module.exports = router;