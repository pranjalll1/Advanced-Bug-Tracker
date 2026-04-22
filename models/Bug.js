const mongoose = require('mongoose');

// ─── Bug Schema ───────────────────────────────────────────────
const bugSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────────────

    // Short descriptive title of the bug
    title: {
      type:      String,
      required:  [true, 'Bug title is required'],
      trim:      true,
      minlength: [5,  'Title must be at least 5 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },

    // Detailed description of the bug
    description: {
      type:      String,
      required:  [true, 'Bug description is required'],
      trim:      true,
      minlength: [10,  'Description must be at least 10 characters'],
    },

    // Steps to reproduce the bug
    stepsToReproduce: {
      type:    String,
      trim:    true,
      default: '',
    },

    // ── Classification ────────────────────────────────────────

    // Severity: how badly does this bug affect the system?
    // Critical → system crash / data loss
    // Major    → major feature broken
    // Minor    → minor feature affected
    // Trivial  → cosmetic / UI issue
    severity: {
      type:    String,
      enum: {
        values:  ['critical', 'major', 'minor', 'trivial'],
        message: 'Severity must be critical, major, minor, or trivial',
      },
      default: 'minor',
    },

    // Priority: how urgently should this be fixed?
    priority: {
      type:    String,
      enum: {
        values:  ['urgent', 'high', 'medium', 'low'],
        message: 'Priority must be urgent, high, medium, or low',
      },
      default: 'medium',
    },

    // Status: where is this bug in the workflow?
    status: {
      type:    String,
      enum: {
        values:  ['open', 'in-progress', 'resolved', 'closed', 'reopened'],
        message: 'Invalid status value',
      },
      default: 'open',
    },

    // ── People ────────────────────────────────────────────────

    // Who reported this bug (tester/manager/admin)
    reportedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Reporter is required'],
    },

    // Which developer is assigned to fix it (can be null initially)
    assignedTo: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // Who last updated the bug status
    updatedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // ── Project Info ──────────────────────────────────────────

    // Which project does this bug belong to
    project: {
      type:    String,
      trim:    true,
      default: 'General',
    },

    // Expected behavior (what should happen)
    expectedBehavior: {
      type:    String,
      trim:    true,
      default: '',
    },

    // Actual behavior (what actually happens)
    actualBehavior: {
      type:    String,
      trim:    true,
      default: '',
    },

    // Environment where bug was found
    environment: {
      type:    String,
      enum: {
        values:  ['development', 'staging', 'production', 'other'],
        message: 'Environment must be development, staging, production, or other',
      },
      default: 'development',
    },

    // ── Dates ─────────────────────────────────────────────────

    // Deadline to fix this bug
    dueDate: {
      type:    Date,
      default: null,
    },

    // When was this bug resolved
    resolvedAt: {
      type:    Date,
      default: null,
    },

    // ── Attachments ───────────────────────────────────────────

    // Array of file/image URLs (for screenshots, logs etc.)
    // Full file upload feature comes in advanced step
    attachments: [
      {
        fileName: { type: String },
        fileUrl:  { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Tags ──────────────────────────────────────────────────

    // Optional tags for filtering (e.g. ['ui', 'auth', 'api'])
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },

  {
    timestamps: true, // Auto adds createdAt and updatedAt
  }
);

// ─── Indexes for faster filtering ─────────────────────────────
// These make search/filter queries much faster in production
bugSchema.index({ status:   1 });
bugSchema.index({ priority: 1 });
bugSchema.index({ severity: 1 });
bugSchema.index({ assignedTo: 1 });
bugSchema.index({ reportedBy: 1 });
bugSchema.index({ project:  1 });

// ─── Model ────────────────────────────────────────────────────
const Bug = mongoose.model('Bug', bugSchema);

module.exports = Bug;