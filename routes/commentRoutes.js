const express = require('express');
const router  = express.Router();

const {
  addComment,
  getComments,
  editComment,
  deleteComment,
} = require('../controllers/commentController');

const { protect } = require('../middleware/authMiddleware');

// ─── Comment Routes ───────────────────────────────────────────

// POST   /api/comments
// Add a comment to a bug or task
router.post('/', protect, addComment);

// GET    /api/comments/:onModel/:referenceId
// Get all comments for a specific bug or task
// e.g. /api/comments/Bug/65abc123
// e.g. /api/comments/Task/65abc456
router.get('/:onModel/:referenceId', protect, getComments);

// PATCH  /api/comments/:id
// Edit a comment (author only)
router.patch('/:id', protect, editComment);

// DELETE /api/comments/:id
// Delete a comment (author or admin)
router.delete('/:id', protect, deleteComment);

module.exports = router;