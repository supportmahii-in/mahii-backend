const Shop = require('../models/Shop');
const { uploadImage, uploadMultipleImages, uploadVideo, deleteFile } = require('../services/uploadService');

// @desc    Upload shop logo
// @route   POST /api/shop/media/logo
// @access  Private (Shop Owner)
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
      return res.status(500).json({ 
        success: false, 
        message: 'Image upload service is not configured. Please contact admin to set up Cloudinary.' 
      });
    }

    const shop = await Shop.findOne({ ownerId: req.user.id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Delete old logo if exists
    if (shop.logo) {
      const oldPublicId = shop.logo.split('/').pop().split('.')[0];
      await deleteFile(`shops/${oldPublicId}`);
    }

    const result = await uploadImage(req.file.buffer.toString('base64'), 'shops/logos');
    shop.logo = result.url;
    await shop.save();

    res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      logo: shop.logo,
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload logo' });
  }
};

// @desc    Upload shop cover image
// @route   POST /api/shop/media/cover
// @access  Private (Shop Owner)
exports.uploadCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
      return res.status(500).json({ 
        success: false, 
        message: 'Image upload service is not configured. Please contact admin to set up Cloudinary.' 
      });
    }

    const shop = await Shop.findOne({ ownerId: req.user.id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const result = await uploadImage(req.file.buffer.toString('base64'), 'shops/covers');
    shop.coverImage = result.url;
    await shop.save();

    res.status(200).json({
      success: true,
      message: 'Cover image uploaded successfully',
      coverImage: shop.coverImage,
    });
  } catch (error) {
    console.error('Cover upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload cover image' });
  }
};

// @desc    Upload shop gallery images
// @route   POST /api/shop/media/gallery
// @access  Private (Shop Owner)
exports.uploadGallery = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
      return res.status(500).json({ 
        success: false, 
        message: 'Image upload service is not configured. Please contact admin to set up Cloudinary.' 
      });
    }

    const shop = await Shop.findOne({ ownerId: req.user.id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const uploadPromises = req.files.map(async (file, index) => {
      const result = await uploadImage(file.buffer.toString('base64'), 'shops/gallery');
      return {
        url: result.url,
        publicId: result.publicId,
        isPrimary: index === 0,
        uploadedAt: new Date(),
      };
    });

    const newImages = await Promise.all(uploadPromises);
    shop.images.push(...newImages);
    await shop.save();

    res.status(200).json({
      success: true,
      message: `${newImages.length} images uploaded successfully`,
      images: shop.images,
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload gallery images' });
  }
};

// @desc    Delete shop image
// @route   DELETE /api/shop/media/image/:imageId
// @access  Private (Shop Owner)
exports.deleteImage = async (req, res) => {
  try {
    const shop = await Shop.findOne({ ownerId: req.user.id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const image = shop.images.id(req.params.imageId);
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    await deleteFile(image.publicId);
    image.remove();
    await shop.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload shop video
// @route   POST /api/shop/media/video
// @access  Private (Shop Owner)
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const shop = await Shop.findOne({ ownerId: req.user.id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const result = await uploadVideo(req.file.buffer.toString('base64'), 'shops/videos');
    shop.videos.push({
      url: result.url,
      thumbnail: result.thumbnail,
      uploadedAt: new Date(),
    });
    await shop.save();

    res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      video: shop.videos[shop.videos.length - 1],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};