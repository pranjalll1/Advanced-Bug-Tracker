// Import jwt to verify tokens
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Protect Middleware ───────────────────────────────────────
// Verifies JWT token on protected routes
// Usage: add 'protect' before any route handler you want to secure
const protect = async (req, res, next) => {
  try {
    let token;

    // Step 1: Check if Authorization header exists and starts with 'Bearer'
    // Header format: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token — split "Bearer tokenvalue" and take index [1]
      token = req.headers.authorization.split(' ')[1];
    }

    // Step 2: If no token found, reject the request
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided. Please login first.',
      });
    }

    // Step 3: Verify the token using our secret key
    // jwt.verify() throws an error if token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded now contains: { id, email, role, iat, exp }

    // Step 4: Find the user in DB using decoded id
    // .select('-password') means exclude password field
    const user = await User.findById(decoded.id).select('-password');

    // Step 5: Check if user still exists (might have been deleted)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists. Please login again.',
      });
    }

    // Step 6: Check if user account is still active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact the administrator.',
      });
    }

    // Step 7: Attach user to request object
    // Now any route using this middleware can access req.user
    req.user = user;

    // Step 8: Call next() to move to the actual route handler
    next();

  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }

    console.error('Auth Middleware Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { protect };