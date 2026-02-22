const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Session } = require('../models');
const { logActivity } = require('../services/auditService');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '1d'
  });
};

// Create login session helper
const createSession = async (user, token, req) => {
  try {
    const expiresAt = new Date();
    // Default to 7 days to match JWT_EXPIRE in .env
    expiresAt.setDate(expiresAt.getDate() + 7);

    return await Session.create({
      userId: user.id,
      token,
      deviceInfo: req.get('User-Agent'),
      ipAddress: req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress,
      expiresAt,
      isActive: true
    });
  } catch (error) {
    console.error('Session Creation Error:', error);
    // Continue even if session creation fails to not block login
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private (Admin only)
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role, fullName } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] }
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'Cashier',
      fullName
    });

    // Log registration
    await logActivity({
      userId: req.user.id,
      action: 'USER_REGISTERED',
      resourceType: 'auth',
      resourceId: user.id.toString(),
      description: `Registered new user: ${username} with role ${user.role}`
    }, req);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id);
    await createSession(user, token, req);

    // Log login
    await logActivity({
      userId: user.id,
      action: 'LOGIN',
      resourceType: 'auth',
      description: `User ${username} logged in`
    }, req);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register biometric ID for current user
// @route   POST /api/auth/register-biometric
// @access  Private
exports.registerBiometric = async (req, res, next) => {
  try {
    const { biometricId } = req.body;

    if (!biometricId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a biometric ID'
      });
    }

    const existingUser = await User.findOne({ where: { biometricId } });
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Biometric ID already taken'
      });
    }

    const user = await User.findByPk(req.user.id);
    user.biometricId = biometricId;
    await user.save();

    // Log biometric registration
    await logActivity({
      userId: req.user.id,
      action: 'BIOMETRIC_REGISTERED',
      resourceType: 'auth',
      description: 'User registered biometric ID'
    }, req);

    res.status(200).json({
      success: true,
      message: 'Biometric ID registered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login with biometric ID
// @route   POST /api/auth/biometric-login
// @access  Public
exports.biometricLogin = async (req, res, next) => {
  try {
    const { biometricId } = req.body;

    const user = await User.findOne({ where: { biometricId } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid biometric credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id);
    await createSession(user, token, req);

    // Log biometric login
    await logActivity({
      userId: user.id,
      action: 'BIOMETRIC_LOGIN',
      resourceType: 'auth',
      description: `User ${user.username} logged in via biometrics`
    }, req);

    res.status(200).json({
      success: true,
      message: 'Biometric login successful',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    if (req.token) {
      await Session.update(
        { isActive: false },
        { where: { token: req.token } }
      );
    }

    // Log logout
    await logActivity({
      userId: req.user.id,
      action: 'LOGOUT',
      resourceType: 'auth',
      description: `User ${req.user.username} logged out`
    }, req);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PUT /api/auth/users/:id/role
// @access  Private (Admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Log role change
    await logActivity({
      userId: req.user.id,
      action: 'ROLE_UPDATE',
      resourceType: 'auth',
      resourceId: user.id.toString(),
      description: `Updated role for ${user.username} from ${oldRole} to ${role}`,
      metadata: { oldRole, newRole: role }
    }, req);

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all available roles
// @route   GET /api/auth/roles
// @access  Private
exports.getRoles = async (req, res, next) => {
  try {
    const { ROLES } = require('../config/roles');
    res.status(200).json({
      success: true,
      data: Object.values(ROLES)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign role to user
// @route   POST /api/auth/assign-role
// @access  Private (Admin only)
exports.assignRoleByBody = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logActivity({
      userId: req.user.id,
      action: 'ROLE_UPDATE',
      resourceType: 'auth',
      resourceId: user.id.toString(),
      description: `Assigned role ${role} to ${user.username} (previously ${oldRole})`,
      metadata: { oldRole, newRole: role }
    }, req);

    res.status(200).json({
      success: true,
      message: 'Role assigned successfully',
      data: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details (Admin)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, password, role, fullName, isActive } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if new username/email already exists (and is not this user)
    if (username || email) {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
          ],
          id: { [Op.ne]: id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username or Email already in use'
        });
      }
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    await logActivity({
      userId: req.user.id,
      action: 'USER_UPDATE',
      resourceType: 'auth',
      resourceId: user.id.toString(),
      description: `Updated details for user ${user.username}`
    }, req);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.destroy();

    await logActivity({
      userId: req.user.id,
      action: 'USER_DELETE',
      resourceType: 'auth',
      resourceId: id,
      description: `Deleted user ${user.username}`
    }, req);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
