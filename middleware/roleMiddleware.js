// ─── Role Middleware ──────────────────────────────────────────
// Restricts routes to specific roles only
// MUST be used AFTER protect middleware
// Usage: authorize('admin') or authorize('admin', 'manager')

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user is set by protect middleware
    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of these roles: ${allowedRoles.join(', ')}. Your role is: ${req.user.role}`,
      });
    }

    // Role is allowed — proceed to route handler
    next();
  };
};

module.exports = { authorize };