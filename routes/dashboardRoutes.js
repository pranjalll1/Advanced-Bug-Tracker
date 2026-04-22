const express = require('express');
const router  = express.Router();

const {
  getAdminDashboard,
  getDeveloperDashboard,
  getManagerDashboard,
} = require('../controllers/dashboardController');

const { protect }   = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// ─── Dashboard Routes ─────────────────────────────────────────

// GET /api/dashboard/admin
// Full platform stats — admin only
router.get('/admin',
  protect,
  authorize('admin'),
  getAdminDashboard
);

// GET /api/dashboard/developer
// Personal stats — developer only
router.get('/developer',
  protect,
  authorize('developer'),
  getDeveloperDashboard
);

// GET /api/dashboard/manager
// Team overview — manager only
router.get('/manager',
  protect,
  authorize('manager'),
  getManagerDashboard
);

module.exports = router;