const Bug  = require('../models/Bug');
const User = require('../models/User');

// ─── CREATE BUG ───────────────────────────────────────────────
// POST /api/bugs
// Any logged in user can report a bug
const createBug = async (req, res) => {
  try {
    const {
      title,
      description,
      severity,
      priority,
      project,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      environment,
      dueDate,
      tags,
    } = req.body;

    // Check required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    // Create bug — reportedBy is automatically set from JWT token
    const bug = await Bug.create({
      title,
      description,
      severity:         severity         || 'minor',
      priority:         priority         || 'medium',
      project:          project          || 'General',
      stepsToReproduce: stepsToReproduce || '',
      expectedBehavior: expectedBehavior || '',
      actualBehavior:   actualBehavior   || '',
      environment:      environment      || 'development',
      dueDate:          dueDate          || null,
      tags:             tags             || [],
      reportedBy:       req.user._id,    // From JWT token via protect middleware
      status:           'open',
    });

    // Populate reporter details before sending response
    await bug.populate('reportedBy', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Bug reported successfully!',
      bug,
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Create Bug Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ALL BUGS ─────────────────────────────────────────────
// GET /api/bugs
// Supports filters: status, severity, priority, project, assignedTo
// Supports search: ?search=login
// Supports sorting: ?sortBy=createdAt&order=desc
const getAllBugs = async (req, res) => {
  try {
    // ── Build Filter Object ──────────────────────────────────
    const filter = {};

    // Filter by status
    if (req.query.status)   filter.status   = req.query.status;

    // Filter by severity
    if (req.query.severity) filter.severity = req.query.severity;

    // Filter by priority
    if (req.query.priority) filter.priority = req.query.priority;

    // Filter by project
    if (req.query.project)  filter.project  = req.query.project;

    // Filter by assigned developer
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    // Filter by who reported it
    if (req.query.reportedBy) filter.reportedBy = req.query.reportedBy;

    // Search by title or description (case-insensitive)
    if (req.query.search) {
      filter.$or = [
        { title:       { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { project:     { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // ── Role-Based Filtering ─────────────────────────────────
//     // Developers only see bugs assigned to them
//     if (req.user.role === 'developer') {
//       if (!req.query.assignedTo) {
//     filter.assignedTo = req.user._id;
//   }
// }
      

    // ── Sorting ──────────────────────────────────────────────
    const sortBy    = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.order  === 'asc' ? 1 : -1;
    const sort      = { [sortBy]: sortOrder };

    // ── Pagination ───────────────────────────────────────────
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    // ── Execute Query ────────────────────────────────────────
    const bugs = await Bug.find(filter)
      .populate('reportedBy', 'name email role')    // Get reporter details
      .populate('assignedTo', 'name email role')    // Get assignee details
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Total count for pagination
    const total = await Bug.countDocuments(filter);

    res.status(200).json({
      success: true,
      count:   bugs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      bugs,
    });

  } catch (error) {
    console.error('Get All Bugs Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET SINGLE BUG ───────────────────────────────────────────
// GET /api/bugs/:id
// Get full details of one bug
const getBugById = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id)
      .populate('reportedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('updatedBy',  'name email role');

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    res.status(200).json({ success: true, bug });

  } catch (error) {
    console.error('Get Bug Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE BUG ───────────────────────────────────────────────
// PATCH /api/bugs/:id
// Admin/Manager can update any bug
// Developer can only update bugs assigned to them
const updateBug = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    // Role check: developer can only update their assigned bugs
    if (
      req.user.role === 'developer' &&
      bug.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update bugs assigned to you.',
      });
    }

    // Fields that are allowed to be updated
    const allowedFields = [
      'title', 'description', 'severity', 'priority',
      'project', 'stepsToReproduce', 'expectedBehavior',
      'actualBehavior', 'environment', 'dueDate', 'tags',
    ];

    // Only update fields that were sent in request
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        bug[field] = req.body[field];
      }
    });

    // Track who made the last update
    bug.updatedBy = req.user._id;

    await bug.save();

    await bug.populate('reportedBy', 'name email role');
    await bug.populate('assignedTo', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Bug updated successfully!',
      bug,
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Update Bug Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE BUG ───────────────────────────────────────────────
// DELETE /api/bugs/:id
// Only admin can delete bugs
const deleteBug = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    await bug.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Bug deleted successfully.',
    });

  } catch (error) {
    console.error('Delete Bug Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── ASSIGN BUG ───────────────────────────────────────────────
// PATCH /api/bugs/:id/assign
// Admin/Manager can assign bugs to developers
const assignBug = async (req, res) => {
  try {
    const { developerId } = req.body;

    if (!developerId) {
      return res.status(400).json({
        success: false,
        message: 'Developer ID is required.',
      });
    }

    // Check the developer exists and has the right role
    const developer = await User.findById(developerId);

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found.',
      });
    }

    if (developer.role !== 'developer') {
      return res.status(400).json({
        success: false,
        message: `Cannot assign bug to ${developer.name} — their role is ${developer.role}, not developer.`,
      });
    }

    if (developer.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign bug to an inactive user.',
      });
    }

    // Find bug and assign
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    bug.assignedTo = developerId;
    bug.status     = 'in-progress'; // Auto update status when assigned
    bug.updatedBy  = req.user._id;

    await bug.save();

    await bug.populate('reportedBy', 'name email');
    await bug.populate('assignedTo', 'name email role');

    res.status(200).json({
      success: true,
      message: `Bug assigned to ${developer.name} successfully!`,
      bug,
    });

  } catch (error) {
    console.error('Assign Bug Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE BUG STATUS ────────────────────────────────────────
// PATCH /api/bugs/:id/status
// Update the status of a bug
const updateBugStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['open', 'in-progress', 'resolved', 'closed', 'reopened'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be: open, in-progress, resolved, closed, or reopened',
      });
    }

    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found.',
      });
    }

    // Developer can only update status of bugs assigned to them
    if (
      req.user.role === 'developer' &&
      bug.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update status of bugs assigned to you.',
      });
    }

    const oldStatus = bug.status;
    bug.status      = status;
    bug.updatedBy   = req.user._id;

    // If bug is being resolved, record the time
    if (status === 'resolved') {
      bug.resolvedAt = new Date();
    }

    // If bug is being reopened, clear resolvedAt
    if (status === 'reopened') {
      bug.resolvedAt = null;
    }

    await bug.save();

    res.status(200).json({
      success: true,
      message: `Bug status changed from '${oldStatus}' to '${status}'.`,
      bug,
    });

  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createBug,
  getAllBugs,
  getBugById,
  updateBug,
  deleteBug,
  assignBug,
  updateBugStatus,
};                                                  