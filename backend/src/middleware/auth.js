const { verifyAccessToken } = require('../utils/jwt');
const { err } = require('../utils/response');
const { mem } = require('../config/database');

const protect = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return err(res, 'No token provided', 401);
    const token   = header.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user    = mem.users.find(u => u.id === decoded.userId);
    if (!user || !user.is_active) return err(res, 'User not found or inactive', 401);
    req.user  = user;
    req.token = token;
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return err(res, 'Token expired. Please refresh.', 401);
    return err(res, 'Invalid token', 401);
  }
};

const premiumOnly = (req, res, next) => {
  if (!req.user.is_premium) return err(res, 'This feature requires FitCore Pro.', 403);
  next();
};

module.exports = { protect, premiumOnly };
