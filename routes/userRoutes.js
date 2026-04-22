const express = require('express');
const router = express.Router();

const { updateProfile, updatePassword, uploadAvatar } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ─── User Profile Routes ──────────────────────────────────────

// PUT /api/users/profile → Update user name/email
router.put('/profile', protect, updateProfile);

// PUT /api/users/password → Update password
router.put('/password', protect, updatePassword);

// POST /api/users/avatar → Upload profile picture
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
