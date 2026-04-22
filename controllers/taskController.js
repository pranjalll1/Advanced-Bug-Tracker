const Task = require('../models/Task');
const User = require('../models/User');

// ─── CREATE TASK ──────────────────────────────────────────────
// POST /api/tasks
// Admin and Manager can create tasks
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      project,
      assignedTo,
      dueDate,
      estimatedHours,
      tags,
      relatedBug,
    } = req.body;

    // Check required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    // If assignedTo is provided, validate the user exists
    if (assignedTo) {
      const assignee = await User.findById(assignedTo);
      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found.',
        });
      }
      if (assignee.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign task to an inactive user.',
        });
      }
    }

    // Create the task
    const task = await Task.create({
      title,
      description,
      priority:       priority       || 'medium',
      project:        project        || 'General',
      assignedTo:     assignedTo     || null,
      dueDate:        dueDate        || null,
      estimatedHours: estimatedHours || 0,
      tags:           tags           || [],
      relatedBug:     relatedBug     || null,
      createdBy:      req.user._id,
      status:         assignedTo ? 'in-progress' : 'todo',
    });

    await task.populate('createdBy',  'name email role');
    await task.populate('assignedTo', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Task created successfully!',
      task,
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Create Task Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ALL TASKS ────────────────────────────────────────────
// GET /api/tasks
// Supports filters: status, priority, project, assignedTo
// Supports search: ?search=login
const getAllTasks = async (req, res) => {
  try {
    const filter = {};

    // Apply filters from query params
    if (req.query.status)     filter.status     = req.query.status;
    if (req.query.priority)   filter.priority   = req.query.priority;
    if (req.query.project)    filter.project    = req.query.project;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.createdBy)  filter.createdBy  = req.query.createdBy;

    // Search by title or description
    if (req.query.search) {
      filter.$or = [
        { title:       { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { project:     { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Role-based filtering
    // Developers only see tasks assigned to them
    // if (req.user.role === 'developer') {
    //   filter.assignedTo = req.user._id;
    // }

    // Sorting
    const sortBy    = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.order  === 'asc' ? 1 : -1;

    // Pagination
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const tasks = await Task.find(filter)
      .populate('createdBy',  'name email role')
      .populate('assignedTo', 'name email role')
      .populate('relatedBug', 'title status severity')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      count:   tasks.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      tasks,
    });

  } catch (error) {
    console.error('Get All Tasks Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET SINGLE TASK ──────────────────────────────────────────
// GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy',  'name email role')
      .populate('assignedTo', 'name email role')
      .populate('updatedBy',  'name email role')
      .populate('relatedBug', 'title status severity priority');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    res.status(200).json({ success: true, task });

  } catch (error) {
    console.error('Get Task Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE TASK ──────────────────────────────────────────────
// PATCH /api/tasks/:id
// Admin/Manager can update any task
// Developer can only update tasks assigned to them
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    // Developer can only update their own assigned tasks
    if (
      req.user.role === 'developer' &&
      task.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update tasks assigned to you.',
      });
    }

    // Allowed fields to update
    const allowedFields = [
      'title', 'description', 'priority', 'project',
      'dueDate', 'estimatedHours', 'actualHours',
      'progress', 'tags', 'relatedBug',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    // Auto set completedAt when progress hits 100
    if (req.body.progress === 100) {
      task.completedAt = new Date();
    }

    task.updatedBy = req.user._id;
    await task.save();

    await task.populate('createdBy',  'name email role');
    await task.populate('assignedTo', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully!',
      task,
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    console.error('Update Task Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE TASK ──────────────────────────────────────────────
// DELETE /api/tasks/:id
// Admin and Manager only
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });

  } catch (error) {
    console.error('Delete Task Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── ASSIGN TASK ──────────────────────────────────────────────
// PATCH /api/tasks/:id/assign
// Admin and Manager only
const assignTask = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    // Validate assignee exists and is active
    const assignee = await User.findById(userId);

    if (!assignee) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (assignee.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign task to an inactive user.',
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    task.assignedTo = userId;
    task.status     = 'in-progress';
    task.updatedBy  = req.user._id;

    await task.save();

    await task.populate('createdBy',  'name email');
    await task.populate('assignedTo', 'name email role');

    res.status(200).json({
      success: true,
      message: `Task assigned to ${assignee.name} successfully!`,
      task,
    });

  } catch (error) {
    console.error('Assign Task Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE TASK STATUS ───────────────────────────────────────
// PATCH /api/tasks/:id/status
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['todo', 'in-progress', 'in-review', 'done', 'cancelled'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be: todo, in-progress, in-review, done, or cancelled',
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    // Developer can only update status of their own tasks
    if (
      req.user.role === 'developer' &&
      task.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update status of tasks assigned to you.',
      });
    }

    const oldStatus = task.status;
    task.status     = status;
    task.updatedBy  = req.user._id;

    // Auto set completedAt when marked done
    if (status === 'done') {
      task.completedAt = new Date();
      task.progress    = 100;
    }

    // Clear completedAt if moved back
    if (status !== 'done') {
      task.completedAt = null;
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: `Task status changed from '${oldStatus}' to '${status}'.`,
      task,
    });

  } catch (error) {
    console.error('Update Task Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
};