// Import mongoose to create the schema
const mongoose = require('mongoose');

// ─── Regex Patterns ───────────────────────────────────────────

// Email pattern: name@domain.extension
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Name pattern: only letters and spaces (2–50 characters)
const nameRegex = /^[a-zA-Z\s]{2,50}$/;

// ─── User Schema ──────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────────────

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      match: [nameRegex, 'Name can only contain letters and spaces (2–50 characters)'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please enter a valid email (e.g. john@gmail.com)'],
    },

    // Stored as bcrypt hash — never plain text
    // Full regex validation happens in the controller BEFORE hashing
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },

    // ── Role & Access ─────────────────────────────────────────

    role: {
      type: String,
      enum: {
        values: ['admin', 'developer', 'manager', 'tester'],
        message: 'Role must be admin, developer, manager, or tester',
      },
      default: 'tester',
    },

    // Every new user starts as pending — admin must approve
    status: {
      type: String,
      enum: {
        values: ['pending', 'active', 'rejected'],
        message: 'Status must be pending, active, or rejected',
      },
      default: 'pending',
    },

    // ── Admin Approval Info ───────────────────────────────────

    // Which admin approved or rejected this user
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // When the admin made the decision
    approvedAt: {
      type: Date,
      default: null,
    },

    // ── Optional Profile ──────────────────────────────────────

    avatar: {
      type: String,
      default: '',
    },
  },

  {
    timestamps: true, // Auto adds: createdAt and updatedAt
  }
);

// ─── Export Model ─────────────────────────────────────────────
const User = mongoose.model('User', userSchema);

module.exports = User;