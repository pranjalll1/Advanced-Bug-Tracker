const express = require('express');
const router  = express.Router();

const {
  createBug,
  getAllBugs,
  getBugById,
  updateBug,
  deleteBug,
  assignBug,
  updateBugStatus,
} = require('../controllers/bugController');

const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// ─── Bug Routes ───────────────────────────────────────────────
// All routes require login (protect)

// POST   /api/bugs         → Any logged in user can report a bug
router.post('/',   protect, createBug);

// GET    /api/bugs         → Get all bugs with filters
router.get('/',    protect, getAllBugs);

// GET    /api/bugs/:id     → Get single bug
router.get('/:id', protect, getBugById);

// PATCH  /api/bugs/:id     → Update bug (admin, manager, assigned developer)
router.patch('/:id', protect, updateBug);

// DELETE /api/bugs/:id     → Admin only
router.delete('/:id', protect, authorize('admin'), deleteBug);

// PATCH  /api/bugs/:id/assign → Admin and manager only
router.patch('/:id/assign', protect, authorize('admin', 'manager'), assignBug);

// PATCH  /api/bugs/:id/status → Admin, manager, assigned developer
router.patch('/:id/status', protect, updateBugStatus);

module.exports = router;