const User = require('../models/User');

// ─── GET ALL PENDING USERS ────────────────────────────────────
// GET /api/admin/users/pending
// Only admin can access this
const getPendingUsers = async (req, res) => {
  try {
    // Find all users with status 'pending'
    // Sort by newest first
    const pendingUsers = await User.find({ status: 'pending' })
      .select('-password')              // Never send passwords
      .sort({ createdAt: -1 });         // Newest registrations first

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      users: pendingUsers,
    });

  } catch (error) {
    console.error('Get Pending Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ALL USERS ────────────────────────────────────────────
// GET /api/admin/users
// Admin sees everyone — all roles, all statuses
const getAllUsers = async (req, res) => {
  try {
    // Optional: filter by status or role using query params
    // e.g. /api/admin/users?status=active&role=developer
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.role)   filter.role   = req.query.role;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });

  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── APPROVE USER ─────────────────────────────────────────────
// PATCH /api/admin/users/:id/approve
// Admin approves a pending user
const approveUser = async (req, res) => {
  try {
    // Step 1: Find user by ID from URL params
    const user = await User.findById(req.params.id);

    // Step 2: Check user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Step 3: Check user is actually pending
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `User is already ${user.status}. Only pending users can be approved.`,
      });
    }

    // Step 4: Update user status to active
    user.status     = 'active';
    user.approvedBy = req.user._id;   // Which admin approved them
    user.approvedAt = new Date();      // When they were approved

    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name}'s account has been approved successfully!`,
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        status:     user.status,
        approvedBy: user.approvedBy,
        approvedAt: user.approvedAt,
      },
    });

  } catch (error) {
    console.error('Approve User Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── REJECT USER ──────────────────────────────────────────────
// PATCH /api/admin/users/:id/reject
// Admin rejects a pending user
const rejectUser = async (req, res) => {
  try {
    // Step 1: Find user by ID
    const user = await User.findById(req.params.id);

    // Step 2: Check user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Step 3: Check user is pending
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `User is already ${user.status}. Only pending users can be rejected.`,
      });
    }

    // Step 4: Update status to rejected
    user.status     = 'rejected';
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name}'s account has been rejected.`,
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        role:   user.role,
        status: user.status,
      },
    });

  } catch (error) {
    console.error('Reject User Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── CHANGE USER ROLE ─────────────────────────────────────────
// PATCH /api/admin/users/:id/role
// Admin can promote or demote a user's role
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    // Step 1: Validate role
    const allowedRoles = ['admin', 'developer', 'manager', 'tester'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be admin, developer, manager, or tester.',
      });
    }

    // Step 2: Find user
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Step 3: Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role.',
      });
    }

    // Step 4: Update role
    const oldRole  = user.role;
    user.role      = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name}'s role changed from ${oldRole} to ${role}.`,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });

  } catch (error) {
    console.error('Change Role Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE USER ──────────────────────────────────────────────
// DELETE /api/admin/users/:id
// Admin can permanently delete a user
const deleteUser = async (req, res) => {
  try {
    // Step 1: Find user
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Step 2: Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    // Step 3: Delete user
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: `${user.name}'s account has been permanently deleted.`,
    });

  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  changeUserRole,
  deleteUser,
};