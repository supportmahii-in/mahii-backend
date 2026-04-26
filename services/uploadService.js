const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

// Configure Cloudinary (Sign up at cloudinary.com)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is properly configured
if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
  console.warn('⚠️ WARNING: Cloudinary is not properly configured. Image uploads will fail.');
  console.warn('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
}

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and videos are allowed'));
  },
});

// Upload single image
const uploadImage = async (file, folder = 'shops') => {
  try {
    // If file is a base64 string, format it as a data URI
    const uploadData = typeof file === 'string' ? `data:image/jpeg;base64,${file}` : file;
    
    const result = await cloudinary.uploader.upload(uploadData, {
      folder,
      transformation: [{ width: 800, height: 600, crop: 'limit' }],
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Upload multiple images
const uploadMultipleImages = async (files, folder = 'shops') => {
  const uploadPromises = files.map(file => uploadImage(file.buffer.toString('base64'), folder));
  return Promise.all(uploadPromises);
};

// Upload video
const uploadVideo = async (file, folder = 'shops/videos') => {
  try {
    // If file is a base64 string, format it as a data URI
    const uploadData = typeof file === 'string' ? `data:video/mp4;base64,${file}` : file;
    
    const result = await cloudinary.uploader.upload(uploadData, {
      folder,
      resource_type: 'video',
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnail: cloudinary.url(result.public_id, { resource_type: 'video', format: 'jpg' }),
    };
  } catch (error) {
    console.error('Video upload error:', error);
    throw error;
  }
};

// Delete file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
};

module.exports = {
  upload,
  uploadImage,
  uploadMultipleImages,
  uploadVideo,
  deleteFile,
};