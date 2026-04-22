const mongoose = require('mongoose');

// ─── Task Schema ──────────────────────────────────────────────
const taskSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────────────

    // Short title of the task
    title: {
      type:      String,
      required:  [true, 'Task title is required'],
      trim:      true,
      minlength: [5,   'Title must be at least 5 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },

    // Detailed description of what needs to be done
    description: {
      type:      String,
      required:  [true, 'Task description is required'],
      trim:      true,
      minlength: [10,  'Description must be at least 10 characters'],
    },

    // ── Classification ────────────────────────────────────────

    // Priority of the task
    priority: {
      type:    String,
      enum: {
        values:  ['urgent', 'high', 'medium', 'low'],
        message: 'Priority must be urgent, high, medium, or low',
      },
      default: 'medium',
    },

    // Current status in the workflow
    status: {
      type:    String,
      enum: {
        values:  ['todo', 'in-progress', 'in-review', 'done', 'cancelled'],
        message: 'Invalid status value',
      },
      default: 'todo',
    },

    // ── Project Info ──────────────────────────────────────────

    // Which project this task belongs to
    project: {
      type:    String,
      trim:    true,
      default: 'General',
    },

    // Optional: link this task to a related bug
    relatedBug: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Bug',
      default: null,
    },

    // ── People ────────────────────────────────────────────────

    // Who created this task (manager or admin)
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Task creator is required'],
    },

    // Who is assigned to complete this task
    assignedTo: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // Who last updated this task
    updatedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // ── Dates ─────────────────────────────────────────────────

    // Deadline for this task
    dueDate: {
      type:    Date,
      default: null,
    },

    // When was this task completed
    completedAt: {
      type:    Date,
      default: null,
    },

    // ── Progress ──────────────────────────────────────────────

    // Percentage completion (0-100)
    progress: {
      type:    Number,
      min:     [0,   'Progress cannot be less than 0'],
      max:     [100, 'Progress cannot exceed 100'],
      default: 0,
    },

    // Estimated hours to complete
    estimatedHours: {
      type:    Number,
      min:     [0, 'Estimated hours cannot be negative'],
      default: 0,
    },

    // Actual hours spent
    actualHours: {
      type:    Number,
      min:     [0, 'Actual hours cannot be negative'],
      default: 0,
    },

    // ── Tags ──────────────────────────────────────────────────

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
taskSchema.index({ status:     1 });
taskSchema.index({ priority:   1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy:  1 });
taskSchema.index({ project:    1 });

// ─── Model ────────────────────────────────────────────────────
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;