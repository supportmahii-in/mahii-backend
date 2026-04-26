const Shop = require('../models/Shop');
const axios = require('axios');

// @desc    Update shop location
// @route   PUT /api/shop/location
// @access  Private (Shop Owner)
exports.updateLocation = async (req, res) => {
  try {
    const { address, city, area, lat, lng, showExactLocation, googlePlaceId } = req.body;
    
    const shop = await Shop.findOne({ ownerId: req.user.id });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    shop.location = {
      address,
      city,
      area,
      lat,
      lng,
      googlePlaceId,
      showExactLocation: showExactLocation !== undefined ? showExactLocation : shop.location.showExactLocation,
    };
    
    await shop.save();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: shop.location,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get address from coordinates (Reverse Geocoding)
// @route   POST /api/location/reverse-geocode
// @access  Private
exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
    );
    
    const address = response.data;
    res.status(200).json({
      success: true,
      address: {
        city: address.address.city || address.address.town,
        area: address.address.suburb || address.address.neighbourhood,
        fullAddress: address.display_name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search places (Google Maps integration)
// @route   GET /api/location/search?query=...
// @access  Public
exports.searchPlaces = async (req, res) => {
  try {
    const { query } = req.query;
    
    // Using OpenStreetMap Nominatim (free alternative to Google)
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10`
    );
    
    const places = response.data.map(place => ({
      name: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      city: place.address?.city || place.address?.town,
      area: place.address?.suburb,
    }));
    
    res.status(200).json({
      success: true,
      places,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};