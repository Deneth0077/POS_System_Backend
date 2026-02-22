const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/roles');
const { apiLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: System activity logs and audit trail
 */

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Retrieve audit logs
 *     description: Get a paginated list of system activities. Restricted to Admin and Manager.
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type (e.g., LOGIN, SALE_CREATED)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), getAuditLogs);

module.exports = router;
