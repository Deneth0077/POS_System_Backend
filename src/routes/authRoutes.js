const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  registerBiometric,
  biometricLogin,
  logout,
  updateUserRole,
  getRoles,
  assignRoleByBody,
  getAllUsers,
  updateUser,
  deleteUser
} = require('../controllers/authController');
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../config/roles');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

// Validation rules
const registerValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn([ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.KITCHEN_STAFF]).withMessage('Invalid role')
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account. Only accessible by Admin users.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 example: john_doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               role:
 *                 type: string
 *                 enum: [admin, manager, cashier]
 *                 default: cashier
 *                 example: cashier
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Validation error or user already exists
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Requires Admin role
 *       429:
 *         description: Too many requests - Rate limit exceeded
 */
router.post('/register', authLimiter, protect, authorize(ROLES.ADMIN), registerValidation, validate, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and receive JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts - Rate limit exceeded
 */
router.post('/login', authLimiter, loginValidation, validate, login);

/**
 * @swagger
 * /api/auth/register-biometric:
 *   post:
 *     summary: Register biometric ID
 *     description: Register a biometric identifier for the currently logged-in user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - biometricId
 *             properties:
 *               biometricId:
 *                 type: string
 *                 example: "device-fingerprint-123456"
 *     responses:
 *       200:
 *         description: Biometric ID registered successfully
 *       400:
 *         description: Biometric ID already in use or missing
 *       401:
 *         description: Unauthorized
 */
router.post('/register-biometric', protect, registerBiometric);

/**
 * @swagger
 * /api/auth/biometric-login:
 *   post:
 *     summary: Biometric login
 *     description: Authenticate user using biometric ID
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - biometricId
 *             properties:
 *               biometricId:
 *                 type: string
 *                 example: "device-fingerprint-123456"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid biometric credentials
 */
router.post('/biometric-login', authLimiter, biometricLogin);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate session/logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', protect, logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: Retrieve authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       429:
 *         description: Too many requests - Rate limit exceeded
 */
router.get('/me', apiLimiter, protect, getMe);

/**
 * @swagger
 * /api/auth/users/{id}/role:
 *   put:
 *     summary: Update user role
 *     description: Change a user's role. Only accessible by Admin.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [Admin, Manager, Cashier, Kitchen Staff]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       403:
 *         description: Only admins can assign roles
 *       404:
 *         description: User not found
 */
router.put('/users/:id/role', protect, authorize(ROLES.ADMIN), [
  body('role').isIn([ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.KITCHEN_STAFF]).withMessage('Invalid role')
], validate, updateUserRole);

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users. Only accessible by Admin.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       403:
 *         description: Forbidden - Requires Admin role
 */
router.get('/users', protect, authorize(ROLES.ADMIN), getAllUsers);

/**
 * @swagger
 * /api/auth/users/{id}:
 *   put:
 *     summary: Update user details
 *     description: Update user details including password. Only accessible by Admin.
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin, Manager, Cashier, Kitchen Staff]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Forbidden
 */
router.put('/users/:id', protect, authorize(ROLES.ADMIN), [
  body('email').optional().isEmail(),
  body('role').optional().isIn([ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.KITCHEN_STAFF])
], validate, updateUser);

/**
 * @swagger
 * /api/auth/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Delete a user account. Only accessible by Admin.
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 */
router.delete('/users/:id', protect, authorize(ROLES.ADMIN), deleteUser);

/**
 * @swagger
 * /api/auth/roles:
 *   get:
 *     summary: Retrieve available roles
 *     description: Returns a list of all user roles defined in the system.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully
 */
router.get('/roles', protect, getRoles);

/**
 * @swagger
 * /api/auth/assign-role:
 *   post:
 *     summary: Assign role to user
 *     description: Assign a new role to a user via request body. Only accessible by Admin.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: integer
 *               role:
 *                 type: string
 *                 enum: [Admin, Manager, Cashier, Kitchen Staff]
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       403:
 *         description: Forbidden - Requires Admin role
 */
router.post('/assign-role', protect, authorize(ROLES.ADMIN), [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('role').isIn([ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.KITCHEN_STAFF]).withMessage('Invalid role')
], validate, assignRoleByBody);

/**
 * @swagger
 * /api/auth/audit-logs:
 *   get:
 *     summary: Fetch activity audit logs
 *     description: Retrieve system activity logs. Restricted to Admin and Manager.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */
router.get('/audit-logs', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), getAuditLogs);

module.exports = router;
