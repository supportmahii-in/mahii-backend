// Import models
const crypto = require('crypto');
const User = require('../models/User');
const Shop = require('../models/Shop');
const AdminLoginAttempt = require('../models/AdminLoginAttempt');
const AdminInvite = require('../models/AdminInvite');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const sendEmail = require('../utils/email');

// @desc    Register Customer
// @route   POST /api/auth/customer/register
// @access  Public
exports.registerCustomer = async (req, res) => {
  try {
    console.log('Received registration data:', req.body); // Debug log

    const { name, email, phone, password, collegeName, address } = req.body;

    // Check all required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!email) missingFields.push('email');
    if (!phone) missingFields.push('phone');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        requiredFields: ['name', 'email', 'phone', 'password']
      });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { phone }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone number'
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: password,
      role: 'customer',
      collegeName: collegeName || '',
      address: address || {},
      isVerified: true,
      isApproved: true
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        collegeName: user.collegeName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Register Shop Owner
// @route   POST /api/auth/shopowner/register
// @access  Public
exports.registerShopOwner = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      shopName,
      shopCategory,
      shopDescription,
      shopAddress,
      shopCity,
      shopArea,
      shopLat,
      shopLng,
      contactNumber,
      fssaiLicense,
      bankDetails,
    } = req.body;

    // VALIDATE REQUIRED LOCATION FIELDS
    if (!shopLat || !shopLng) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates (latitude/longitude) are required. Please select location on map.',
      });
    }

    if (!shopCity) {
      return res.status(400).json({
        success: false,
        message: 'City is required',
      });
    }

    if (!shopArea) {
      return res.status(400).json({
        success: false,
        message: 'Area/Locality is required',
      });
    }

    if (!shopAddress) {
      return res.status(400).json({
        success: false,
        message: 'Complete address is required',
      });
    }

    // Core field validation
    if (!name || !email || !phone || !password || !shopName || !shopCategory) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
        missing: {
          name: !name,
          email: !email,
          phone: !phone,
          password: !password,
          shopName: !shopName,
          shopCategory: !shopCategory,
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone',
      });
    }

    // Create user (pending admin approval)
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'shopowner',
      fssaiLicense,
      bankDetails,
      isVerified: true,
      isApproved: false,
      approvalStatus: 'pending',
    });

    // Create shop with COMPLETE location data
    const shop = await Shop.create({
      name: shopName,
      ownerId: user._id,
      category: shopCategory,
      description: shopDescription || 'New shop registration pending review',
      location: {
        city: shopCity,
        area: shopArea,
        address: shopAddress,
        lat: parseFloat(shopLat),
        lng: parseFloat(shopLng),
      },
      contactNumber: contactNumber || phone,
      isActive: false,
      isApproved: false,
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Shop Registration',
        message: `${shopName} has registered and needs approval.`,
        type: 'admin',
        data: { shopId: shop._id, shopName: shop.name },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Shop owner registered successfully. Waiting for admin approval.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        approvalStatus: user.approvalStatus,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        isActive: shop.isActive,
        location: shop.location,
      },
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

// @desc    Login User (Customer/ShopOwner)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and role'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This login is for ${role}s only.`
      });
    }

    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify admin secret key
// @route   POST /api/auth/verify-admin-secret
// @access  Public (hidden route)
exports.verifyAdminSecret = async (req, res) => {
  try {
    const { secretKey } = req.body;

    if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
      await AdminLoginAttempt.create({
        email: req.body.email || null,
        endpoint: '/api/auth/verify-admin-secret',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        message: 'Invalid secret key',
      }).catch(console.error);

      return res.status(401).json({
        success: false,
        message: 'Invalid secret key',
      });
    }

    res.json({
      success: true,
      message: 'Secret key verified',
    });
  } catch (error) {
    console.error('verifyAdminSecret error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Verify admin MFA
// @route   POST /api/auth/verify-mfa
// @access  Public (hidden route)
exports.verifyMfa = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and authentication code are required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(401).json({
        success: false,
        message: 'MFA is not enabled for this account',
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: otp,
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication code',
      });
    }

    res.json({
      success: true,
      message: 'MFA verified',
    });
  } catch (error) {
    console.error('verifyMfa error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Admin Login
// @route   POST /api/auth/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password, secretKey } = req.body;

    if (!email || !password || !secretKey) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and secret key',
      });
    }

    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      await AdminLoginAttempt.create({
        email: email.toLowerCase(),
        endpoint: '/api/auth/admin/login',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        message: 'Invalid secret key',
      }).catch(console.error);

      return res.status(401).json({
        success: false,
        message: 'Invalid secret key',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      await AdminLoginAttempt.create({
        email: email.toLowerCase(),
        endpoint: '/api/auth/admin/login',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        message: 'Invalid credentials',
      }).catch(console.error);

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!['admin', 'super_admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      await AdminLoginAttempt.create({
        email: email.toLowerCase(),
        endpoint: '/api/auth/admin/login',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        message: 'Invalid credentials',
      }).catch(console.error);

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    const sessionTimeoutMinutes = Number(process.env.ADMIN_SESSION_TIMEOUT_MINUTES) || 30;
    const clientIP = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');
    user.adminSessionId = sessionId;
    user.adminSessionIp = clientIP;
    user.adminSessionExpiresAt = new Date(Date.now() + sessionTimeoutMinutes * 60 * 1000);
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: `${sessionTimeoutMinutes}m` }
    );

    await AdminLoginAttempt.create({
      email: email.toLowerCase(),
      endpoint: '/api/auth/admin/login',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      message: 'Admin login successful',
    }).catch(console.error);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Setup first admin (One-time only)
// @route   POST /api/auth/setup-admin
// @access  Private (with secret key)
exports.setupAdmin = async (req, res) => {
  try {
    const { secretKey, name, email, password } = req.body;

    // Verify secret key (store in .env)
    if (secretKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup key'
      });
    }

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists. Use existing admin account.'
      });
    }

    // Create admin
    const admin = await User.create({
      name,
      email,
      phone: '0000000000',
      password,
      role: 'admin',
      isVerified: true,
      isApproved: true
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};