const mongoose = require('mongoose');

// ─── Comment Schema ───────────────────────────────────────────
const commentSchema = new mongoose.Schema(
  {
    // ── Comment Content ───────────────────────────────────────

    // The actual comment text
    text: {
      type:      String,
      required:  [true, 'Comment text is required'],
      trim:      true,
      minlength: [2,    'Comment must be at least 2 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },

    // ── Author ────────────────────────────────────────────────

    // Who wrote this comment
    author: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Comment author is required'],
    },

    // ── Reference (Bug or Task) ───────────────────────────────

    // The ID of the bug or task this comment belongs to
    reference: {
      type:     mongoose.Schema.Types.ObjectId,
      required: [true, 'Reference ID is required'],
      // This is a dynamic reference — points to either Bug or Task
      refPath:  'onModel',
    },

    // Which model does this comment belong to?
    // 'Bug' or 'Task'
    onModel: {
      type:     String,
      required: true,
      enum:     ['Bug', 'Task'],
    },

    // ── Edit Tracking ─────────────────────────────────────────

    // Was this comment edited after posting?
    isEdited: {
      type:    Boolean,
      default: false,
    },

    // When was it last edited
    editedAt: {
      type:    Date,
      default: null,
    },
  },

  {
    timestamps: true, // Auto adds createdAt and updatedAt
  }
);

// ─── Indexes ──────────────────────────────────────────────────
// Makes fetching comments for a bug/task very fast
commentSchema.index({ reference: 1, onModel: 1 });
commentSchema.index({ author: 1 });

// ─── Model ────────────────────────────────────────────────────
const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;