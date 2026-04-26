const RateLimit = require('express-rate-limit');

exports.adminRateLimiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many admin login attempts. Please try again after 15 minutes.',
  },
  keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown',
});

exports.ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    const cleanIP = clientIP.replace('::ffff:', '');
    const normalizedIP = cleanIP === '::1' ? '127.0.0.1' : cleanIP;
    const allowed = allowedIPs.includes('*') || allowedIPs.includes(cleanIP) || allowedIPs.includes(normalizedIP);

    if (allowed) {
      return next();
    }

    console.warn(`Blocked admin access from unauthorized IP: ${normalizedIP}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied from this IP address',
    });
  };
};
