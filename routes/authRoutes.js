const express = require('express');
const router = express.Router();

// Import controller functions
const { registerUser, loginUser, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ─── Auth Routes ──────────────────────────────────────────────

// POST /api/auth/register → Register new user (status: pending)
router.post('/register', registerUser);

// POST /api/auth/login → Login and get JWT token
router.post('/login', loginUser);

// GET /api/auth/me → Get current logged in user (protected - next step)
router.get('/me', protect, getMe);

// POST /api/auth/forgot-password → Generate reset token
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password/:token → Reset password
router.post('/reset-password/:token', resetPassword);

module.exports = router;