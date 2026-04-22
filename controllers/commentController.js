const Comment = require('../models/Comment');
const Bug     = require('../models/Bug');
const Task    = require('../models/Task');

// ─── Helper: Check if reference exists ───────────────────────
// Verifies the bug or task actually exists before adding comment
const checkReferenceExists = async (onModel, referenceId) => {
  if (onModel === 'Bug') {
    return await Bug.findById(referenceId);
  } else if (onModel === 'Task') {
    return await Task.findById(referenceId);
  }
  return null;
};

// ─── ADD COMMENT ─────────────────────────────────────────────
// POST /api/comments
// Any logged in user can add a comment
const addComment = async (req, res) => {
  try {
    const { text, reference, onModel } = req.body;

    // Step 1: Validate required fields
    if (!text || !reference || !onModel) {
      return res.status(400).json({
        success: false,
        message: 'text, reference (bug/task ID), and onModel (Bug or Task) are required',
      });
    }

    // Step 2: Validate onModel value
    if (!['Bug', 'Task'].includes(onModel)) {
      return res.status(400).json({
        success: false,
        message: 'onModel must be either "Bug" or "Task"',
      });
    }

    // Step 3: Check the bug or task actually exists
    const referenceDoc = await checkReferenceExists(onModel, reference);
    if (!referenceDoc) {
      return res.status(404).json({
        success: false,
        message: `${onModel} not found. Cannot add comment.`,
      });
    }

    // Step 4: Create the comment
    const comment = await Comment.create({
      text,
      reference,
      onModel,
      author: req.user._id,   // From JWT token
    });

    // Step 5: Populate author details
    await comment.populate('author', 'name email role avatar');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully!',
      comment,
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Add Comment Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET COMMENTS ─────────────────────────────────────────────
// GET /api/comments/:onModel/:referenceId
// Get all comments for a specific bug or task
// e.g. GET /api/comments/Bug/65abc123
// e.g. GET /api/comments/Task/65abc456
const getComments = async (req, res) => {
  try {
    const { onModel, referenceId } = req.params;

    // Validate onModel
    if (!['Bug', 'Task'].includes(onModel)) {
      return res.status(400).json({
        success: false,
        message: 'onModel must be either "Bug" or "Task"',
      });
    }

    // Check reference exists
    const referenceDoc = await checkReferenceExists(onModel, referenceId);
    if (!referenceDoc) {
      return res.status(404).json({
        success: false,
        message: `${onModel} not found.`,
      });
    }

    // Fetch all comments for this bug/task
    // Sorted oldest first (conversation order)
    const comments = await Comment.find({
      reference: referenceId,
      onModel,
    })
      .populate('author', 'name email role avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count:   comments.length,
      comments,
    });

  } catch (error) {
    console.error('Get Comments Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── EDIT COMMENT ─────────────────────────────────────────────
// PATCH /api/comments/:id
// Only the comment author can edit their own comment
const editComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required.',
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Only the author can edit their comment
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only edit your own comments.',
      });
    }

    // Update comment
    comment.text     = text;
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();
    await comment.populate('author', 'name email role avatar');

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully!',
      comment,
    });

  } catch (error) {
    console.error('Edit Comment Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE COMMENT ───────────────────────────────────────────
// DELETE /api/comments/:id
// Author or Admin can delete a comment
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    // Allow deletion if: user is the author OR user is admin
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin  = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own comments.',
      });
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
    });

  } catch (error) {
    console.error('Delete Comment Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  addComment,
  getComments,
  editComment,
  deleteComment,
};