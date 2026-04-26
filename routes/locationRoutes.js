const express = require('express');
const router = express.Router();
const { reverseGeocode, searchPlaces } = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/search', searchPlaces);

// Private routes
router.post('/reverse-geocode', protect, reverseGeocode);

module.exports = router;