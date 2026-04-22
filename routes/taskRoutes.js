const express = require('express');
const router  = express.Router();

const {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
} = require('../controllers/taskController');

const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// ─── Task Routes ──────────────────────────────────────────────

// POST   /api/tasks           → Admin and Manager only
router.post('/',    protect, authorize('admin', 'manager'), createTask);

// GET    /api/tasks           → All logged in users
router.get('/',     protect, getAllTasks);

// GET    /api/tasks/:id       → All logged in users
router.get('/:id',  protect, getTaskById);

// PATCH  /api/tasks/:id       → Admin, Manager, assigned Developer
router.patch('/:id', protect, updateTask);

// DELETE /api/tasks/:id       → Admin and Manager only
router.delete('/:id', protect, authorize('admin', 'manager'), deleteTask);

// PATCH  /api/tasks/:id/assign  → Admin and Manager only
router.patch('/:id/assign', protect, authorize('admin', 'manager'), assignTask);

// PATCH  /api/tasks/:id/status  → All logged in users (with role check inside)
router.patch('/:id/status', protect, updateTaskStatus);

module.exports = router;