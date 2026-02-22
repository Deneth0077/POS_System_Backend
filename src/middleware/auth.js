const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if session is active in database
      const session = await Session.findOne({
        where: {
          token: token,
          isActive: true
        }
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Session has expired or been logged out'
        });
      }

      // Update session last activity
      session.lastActivity = new Date();
      await session.save();

      // Get user from token (Sequelize)
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Attach token to request object for logout
      req.token = token;

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // specific handling for array of roles passed as arguments
    const allowedRoles = roles.map(role => role.toLowerCase());
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
