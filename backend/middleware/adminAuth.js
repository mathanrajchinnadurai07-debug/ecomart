const { ADMIN_EMAIL } = require('../config/constants');

/**
 * Require admin role (must run AFTER verifyToken).
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized – no user info' });
  }

  const email = req.user.email;
  const role = req.user.role;

  // Accept admin if email matches config or token explicitly lists admin role
  if (role === 'admin' || email === ADMIN_EMAIL) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden – admin access required' });
};

module.exports = { requireAdmin };
