const express = require('express');
const router = express.Router();

// Import controllers
const {
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  changeUserRole,
  deleteUser,
} = require('../controllers/adminController');

// Import middleware
const { protect }    = require('../middleware/authMiddleware');
const { authorize }  = require('../middleware/roleMiddleware');

// ─── All admin routes require:
// 1. Valid JWT token (protect)
// 2. Role must be 'admin' (authorize)
// ─────────────────────────────────────────────────────────────

// GET  /api/admin/users/pending    → Get all pending users
router.get('/users/pending',        protect, authorize('admin'), getPendingUsers);

// GET  /api/admin/users            → Get all users (with optional filters)
router.get('/users',                protect, authorize('admin'), getAllUsers);

// PATCH /api/admin/users/:id/approve → Approve a user
router.patch('/users/:id/approve',  protect, authorize('admin'), approveUser);

// PATCH /api/admin/users/:id/reject  → Reject a user
router.patch('/users/:id/reject',   protect, authorize('admin'), rejectUser);

// PATCH /api/admin/users/:id/role    → Change user role
router.patch('/users/:id/role',     protect, authorize('admin'), changeUserRole);

// DELETE /api/admin/users/:id        → Delete a user
router.delete('/users/:id',         protect, authorize('admin'), deleteUser);

module.exports = router;