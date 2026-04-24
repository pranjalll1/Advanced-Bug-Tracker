const Bug     = require('../models/Bug');
const Task    = require('../models/Task');
const User    = require('../models/User');
const Comment = require('../models/Comment');

// ─── ADMIN DASHBOARD ──────────────────────────────────────────
// GET /api/dashboard/admin
// Full platform overview — admin only
const getAdminDashboard = async (req, res) => {
  try {

    // ── User Stats ───────────────────────────────────────────
    const totalUsers      = await User.countDocuments();
    const pendingUsers    = await User.countDocuments({ status: 'pending'  });
    const activeUsers     = await User.countDocuments({ status: 'active'   });
    const rejectedUsers   = await User.countDocuments({ status: 'rejected' });

    // Users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id:   '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    // ── Bug Stats ────────────────────────────────────────────
    const totalBugs      = await Bug.countDocuments();
    const openBugs       = await Bug.countDocuments({ status: 'open'        });
    const inProgressBugs = await Bug.countDocuments({ status: 'in-progress' });
    const resolvedBugs   = await Bug.countDocuments({ status: 'resolved'    });
    const closedBugs     = await Bug.countDocuments({ status: 'closed'      });
    const reopenedBugs   = await Bug.countDocuments({ status: 'reopened'    });

    // Bugs by severity
    const bugsBySeverity = await Bug.aggregate([
      {
        $group: {
          _id:   '$severity',
          count: { $sum: 1 },
        },
      },
    ]);

    // Bugs by priority
    const bugsByPriority = await Bug.aggregate([
      {
        $group: {
          _id:   '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    // Unassigned bugs (need attention)
    const unassignedBugs = await Bug.countDocuments({ assignedTo: null });

    // // ── Task Stats ───────────────────────────────────────────
    const totalTasks      = await Task.countDocuments();
    const todoTasks       = await Task.countDocuments({ status: 'todo'        });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
    const inReviewTasks   = await Task.countDocuments({ status: 'in-review'   });
    const doneTasks       = await Task.countDocuments({ status: 'done'        });
    const cancelledTasks  = await Task.countDocuments({ status: 'cancelled'   });

    // Tasks by priority
    const tasksByPriority = await Task.aggregate([
      {
        $group: {
          _id:   '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    // ── Recent Activity ───────────────────────────────────────
    // Last 5 bugs reported
    const recentBugs = await Bug.find()
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status severity priority createdAt reportedBy assignedTo');

    // Last 5 tasks created
    const recentTasks = await Task.find()
      .populate('createdBy',  'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status priority createdAt createdBy assignedTo');

    // Last 5 comments
    const recentComments = await Comment.find()
      .populate('author', 'name email role')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('text onModel reference createdAt author');

    // ── Overdue Items ─────────────────────────────────────────
    const now = new Date();

    const overdueBugs = await Bug.countDocuments({
      dueDate: { $lt: now },
      status:  { $nin: ['resolved', 'closed'] },
    });

    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: now },
      status:  { $nin: ['done', 'cancelled'] },
    });

    // ── Send Response ─────────────────────────────────────────
    res.status(200).json({
      success: true,
      dashboard: {
        users: {
          total:    totalUsers,
          pending:  pendingUsers,
          active:   activeUsers,
          rejected: rejectedUsers,
          byRole:   usersByRole,
        },
        bugs: {
          total:       totalBugs,
          unassigned:  unassignedBugs,
          overdue:     overdueBugs,
          byStatus: {
            open:       openBugs,
            inProgress: inProgressBugs,
            resolved:   resolvedBugs,
            closed:     closedBugs,
            reopened:   reopenedBugs,
          },
          bySeverity: bugsBySeverity,
          byPriority: bugsByPriority,
        },
        tasks: {
          total:    totalTasks,
          overdue:  overdueTasks,
          byStatus: {
            todo:       todoTasks,
            inProgress: inProgressTasks,
            inReview:   inReviewTasks,
            done:       doneTasks,
            cancelled:  cancelledTasks,
          },
          byPriority: tasksByPriority,
        },
        recentActivity: {
          bugs:     recentBugs,
          tasks:    recentTasks,
          comments: recentComments,
        },
      },
    });

  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DEVELOPER DASHBOARD ──────────────────────────────────────
// GET /api/dashboard/developer
// Personal overview for the logged in developer
const getDeveloperDashboard = async (req, res) => {
  try {
    const myId = req.user._id;

    // ── My Bug Stats ─────────────────────────────────────────
    const myTotalBugs      = await Bug.countDocuments({ assignedTo: myId });
    const myOpenBugs       = await Bug.countDocuments({ assignedTo: myId, status: 'open'        });
    const myInProgressBugs = await Bug.countDocuments({ assignedTo: myId, status: 'in-progress' });
    const myResolvedBugs   = await Bug.countDocuments({ assignedTo: myId, status: 'resolved'    });
    const myReopenedBugs   = await Bug.countDocuments({ assignedTo: myId, status: 'reopened'    });

    // ── My Task Stats ─────────────────────────────────────────
    const myTotalTasks      = await Task.countDocuments({ assignedTo: myId });
    const myTodoTasks       = await Task.countDocuments({ assignedTo: myId, status: 'todo'        });
    const myInProgressTasks = await Task.countDocuments({ assignedTo: myId, status: 'in-progress' });
    const myInReviewTasks   = await Task.countDocuments({ assignedTo: myId, status: 'in-review'   });
    const myDoneTasks       = await Task.countDocuments({ assignedTo: myId, status: 'done'        });

    // ── Overdue Items ─────────────────────────────────────────
    const now = new Date();

    const myOverdueBugs = await Bug.countDocuments({
      assignedTo: myId,
      dueDate:    { $lt: now },
      status:     { $nin: ['resolved', 'closed'] },
    });

    const myOverdueTasks = await Task.countDocuments({
      assignedTo: myId,
      dueDate:    { $lt: now },
      status:     { $nin: ['done', 'cancelled'] },
    });

    // ── My Recent Bugs ────────────────────────────────────────
    const myRecentBugs = await Bug.find({ assignedTo: myId })
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status severity priority dueDate createdAt');

    // ── My Recent Tasks ───────────────────────────────────────
    const myRecentTasks = await Task.find({ assignedTo: myId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status priority progress dueDate createdAt');

    // ── Urgent Items (high priority + not resolved) ───────────
    const urgentBugs = await Bug.find({
      assignedTo: myId,
      priority:   { $in: ['urgent', 'high'] },
      status:     { $nin: ['resolved', 'closed'] },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title status severity priority dueDate');

    res.status(200).json({
      success: true,
      dashboard: {
        bugs: {
          total:      myTotalBugs,
          overdue:    myOverdueBugs,
          byStatus: {
            open:       myOpenBugs,
            inProgress: myInProgressBugs,
            resolved:   myResolvedBugs,
            reopened:   myReopenedBugs,
          },
        },
        tasks: {
          total:   myTotalTasks,
          overdue: myOverdueTasks,
          byStatus: {
            todo:       myTodoTasks,
            inProgress: myInProgressTasks,
            inReview:   myInReviewTasks,
            done:       myDoneTasks,
          },
        },
        recentActivity: {
          bugs:  myRecentBugs,
          tasks: myRecentTasks,
        },
        urgentBugs,
      },
    });

  } catch (error) {
    console.error('Developer Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── MANAGER DASHBOARD ────────────────────────────────────────
// GET /api/dashboard/manager
// Team overview for managers
const getManagerDashboard = async (req, res) => {
  try {
    // ── Bug Stats ────────────────────────────────────────────
    const totalBugs      = await Bug.countDocuments();
    const openBugs       = await Bug.countDocuments({ status: 'open'        });
    const inProgressBugs = await Bug.countDocuments({ status: 'in-progress' });
    const resolvedBugs   = await Bug.countDocuments({ status: 'resolved'    });
    const unassignedBugs = await Bug.countDocuments({ assignedTo: null      });

    // ── Task Stats ───────────────────────────────────────────
    const totalTasks      = await Task.countDocuments();
    const todoTasks       = await Task.countDocuments({ status: 'todo'        });
    const inProgressTasks = await Task.countDocuments({ status: 'in-progress' });
    const doneTasks       = await Task.countDocuments({ status: 'done'        });

    // ── Team Performance ──────────────────────────────────────
    // Bugs resolved per developer
    const bugsByDeveloper = await Bug.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id:      '$assignedTo',
          total:    { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'developer',
        },
      },
      { $unwind: '$developer' },
      {
        $project: {
          name:     '$developer.name',
          email:    '$developer.email',
          total:    1,
          resolved: 1,
        },
      },
    ]);

    // ── Overdue Items ─────────────────────────────────────────
    const now = new Date();

    const overdueBugs = await Bug.find({
      dueDate: { $lt: now },
      status:  { $nin: ['resolved', 'closed'] },
    })
      .populate('assignedTo', 'name email')
      .limit(5)
      .select('title status priority dueDate assignedTo');

    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status:  { $nin: ['done', 'cancelled'] },
    })
      .populate('assignedTo', 'name email')
      .limit(5)
      .select('title status priority dueDate assignedTo');

    // ── Recent Activity ───────────────────────────────────────
    const recentBugs = await Bug.find()
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status severity priority createdAt');

    const recentTasks = await Task.find()
      .populate('createdBy',  'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status priority createdAt');

    res.status(200).json({
      success: true,
      dashboard: {
        bugs: {
          total:      totalBugs,
          unassigned: unassignedBugs,
          byStatus: {
            open:       openBugs,
            inProgress: inProgressBugs,
            resolved:   resolvedBugs,
          },
        },
        tasks: {
          total: totalTasks,
          byStatus: {
            todo:       todoTasks,
            inProgress: inProgressTasks,
            done:       doneTasks,
          },
        },
        teamPerformance: bugsByDeveloper,
        overdueItems: {
          bugs:  overdueBugs,
          tasks: overdueTasks,
        },
        recentActivity: {
          bugs:  recentBugs,
          tasks: recentTasks,
        },
      },
    });

  } catch (error) {
    console.error('Manager Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── TESTER DASHBOARD ─────────────────────────────────────────
// GET /api/dashboard/tester
// Personal overview for the logged in tester
const getTesterDashboard = async (req, res) => {
  try {
    const myId = req.user._id;

    // ── My Bug Stats ─────────────────────────────────────────
    const myTotalBugs      = await Bug.countDocuments({ });
    const myOpenBugs       = await Bug.countDocuments({ status: 'open'        });
    const myInProgressBugs = await Bug.countDocuments({ status: 'in-progress' });
    const myResolvedBugs   = await Bug.countDocuments({ status: 'resolved'    });
    const myReopenedBugs   = await Bug.countDocuments({  status: 'reopened'    });

    // ── My Task Stats ─────────────────────────────────────────
    const myTotalTasks      = await Task.countDocuments({ });
    const myTodoTasks       = await Task.countDocuments({  status: 'todo'        });
    const myInProgressTasks = await Task.countDocuments({  status: 'in-progress' });
    const myInReviewTasks   = await Task.countDocuments({  status: 'in-review'   });
    const myDoneTasks       = await Task.countDocuments({  status: 'done'        });

    // ── My Recent Activity ────────────────────────────────────
    const myRecentBugs = await Bug.find({ reportedBy: myId })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status severity priority dueDate createdAt');

    const myRecentTasks = await Task.find({ assignedTo: myId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status priority progress dueDate createdAt');

    res.status(200).json({
      success: true,
      dashboard: {
        bugs: {
          total:      myTotalBugs,
          byStatus: {
            open:       myOpenBugs,
            inProgress: myInProgressBugs,
            resolved:   myResolvedBugs,
            reopened:   myReopenedBugs,
          },
        },
        tasks: {
          total:   myTotalTasks,
          byStatus: {
            todo:       myTodoTasks,
            inProgress: myInProgressTasks,
            inReview:   myInReviewTasks,
            done:       myDoneTasks,
          },
        },
        recentActivity: {
          bugs:  myRecentBugs,
          tasks: myRecentTasks,
        },
      },
    });

  } catch (error) {
    console.error('Tester Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getAdminDashboard,
  getDeveloperDashboard,
  getManagerDashboard,
  getTesterDashboard,
};