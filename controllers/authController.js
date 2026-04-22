// Import required packages
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// ─── Password Validation Regex ────────────────────────────────
// Rules: min 8 chars, 1 uppercase, 1 number, 1 special character
const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// ─── Helper: Generate JWT Token ───────────────────────────────
// Takes user data and returns a signed token
const generateToken = (user) => {
  return jwt.sign(
    // Payload — data stored inside the token
    {
      id:    user._id,
      email: user.email,
      role:  user.role,
    },
    // Secret key from .env — used to sign and verify token
    process.env.JWT_SECRET,
    // Token expires in 7 days
    { expiresIn: '7d' }
  );
};

// ─── REGISTER ─────────────────────────────────────────────────
// POST /api/auth/register
// Public — anyone can register, starts as 'pending'
const registerUser = async (req, res) => {
  try {
    // Step 1: Pull data from request body
    const { name, email, password, role } = req.body;

    // Step 2: Check all fields are provided
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, password, role',
      });
    }

    // Validate name (no special characters allowed)
    const nameRegex = /^[a-zA-Z0-9\s]+$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot contain special characters.',
      });
    }

    // Step 3: Validate password format BEFORE hashing
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include: 1 uppercase letter, 1 number, and 1 special character (e.g. Pranjal@123)',
      });
    }

    // Step 4: Check if email already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered. Please use a different email.',
      });
    }

    // Step 5: Prevent self-registration as admin
    const allowedRoles = ['developer', 'manager', 'tester'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be developer, manager, or tester. Admin accounts are created separately.',
      });
    }

    // Step 6: Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Step 7: Save user to database
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      status:   'pending',
    });

    // Step 8: Send success response (never send password back)
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please wait for admin approval before logging in.',
      user: {
        id:        newUser._id,
        name:      newUser.name,
        email:     newUser.email,
        role:      newUser.role,
        status:    newUser.status,
        createdAt: newUser.createdAt,
      },
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────────
// POST /api/auth/login
// Public — but only active users can login
const loginUser = async (req, res) => {
  try {
    // Step 1: Pull email and password from request body
    const { email, password } = req.body;

    // Step 2: Check both fields are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Step 3: Find user by email in database
    const user = await User.findOne({ email: email.toLowerCase() });

    // If no user found with that email
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        // Note: we don't say "email not found" for security reasons
        // That would tell hackers which emails are registered
      });
    }

    // Step 4: Check account status BEFORE checking password
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please wait for admin to approve your account.',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been rejected. Please contact the administrator.',
      });
    }

    // Step 5: Compare entered password with hashed password in DB
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Step 6: Generate JWT token
    const token = generateToken(user);

    // Step 7: Send success response with token
    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,                    // Frontend stores this in localStorage
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────
// GET /api/auth/me
// Protected — requires valid JWT token (middleware added in next step)
const getMe = async (req, res) => {
  try {
    // req.user is set by auth middleware (coming in Step 6)
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────
// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expire to 10 minutes
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Since we are simulating emails:
    res.status(200).json({
      success: true,
      message: 'Email sent',
      resetToken, // send plain token for frontend link simulation
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────
// POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token or token has expired' });
    }

    // Set new password
    const { password } = req.body;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include: 1 uppercase letter, 1 number, and 1 special character (e.g. Pranjal@123)',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { registerUser, loginUser, getMe, forgotPassword, resetPassword };