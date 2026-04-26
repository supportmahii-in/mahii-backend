const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization || req.headers.Authorization || '';

  // Check if token exists in headers
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.split(' ')[1]?.trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyError) {
      console.error('JWT VERIFY ERROR:', verifyError.message);
      throw verifyError;
    }

    // Get user from token
    // Fetch user without password field (default excluded) and with sensitive admin fields
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      if (!decoded.sessionId || decoded.sessionId !== user.adminSessionId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin session. Please login again.',
        });
      }

      if (!user.adminSessionExpiresAt || new Date(user.adminSessionExpiresAt) < new Date()) {
        return res.status(401).json({
          success: false,
          message: 'Admin session expired. Please login again.',
        });
      }

      const clientIP = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');
      if (user.adminSessionIp && user.adminSessionIp !== clientIP) {
        return res.status(401).json({
          success: false,
          message: 'Session invalid due to IP change. Please login again.',
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};