const express = require('express');
const router = express.Router();
const {
  createTable,
  getAllTables,
  getTableById,
  updateTable,
  deleteTable,
  assignOrderToTable,
  releaseTable,
  getTableOrders,
  getAvailableTables
} = require('../controllers/tableController');

const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply protection to all routes
router.use(protect);

/**
 * @swagger
 * components:
 *   schemas:
 *     Table:
 *       type: object
 *       required:
 *         - tableNumber
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated table ID
 *         tableNumber:
 *           type: string
 *           maxLength: 10
 *           description: Unique table identifier
 *         capacity:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 4
 *           description: Maximum seating capacity
 *         status:
 *           type: string
 *           enum: [available, occupied, reserved, maintenance]
 *           default: available
 *           description: Current table status
 *         location:
 *           type: string
 *           maxLength: 50
 *           description: Table section/location
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether table is active
 *         notes:
 *           type: string
 *           description: Additional notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 1
 *         tableNumber: "T-01"
 *         capacity: 4
 *         status: available
 *         location: Indoor
 *         isActive: true
 */

/**
 * @swagger
 * /api/tables/status/available:
 *   get:
 *     summary: Get all available tables
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: capacity
 *         schema:
 *           type: integer
 *         description: Minimum capacity required
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *     responses:
 *       200:
 *         description: List of available tables
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Table'
 *       401:
 *         description: Unauthorized
 */
router.get('/status/available', apiLimiter, getAvailableTables);

/**
 * @swagger
 * /api/tables:
 *   get:
 *     summary: Get all tables
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, occupied, reserved, maintenance]
 *         description: Filter by status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of all tables
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Table'
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a new table
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableNumber
 *             properties:
 *               tableNumber:
 *                 type: string
 *                 example: "T-01"
 *               capacity:
 *                 type: integer
 *                 example: 4
 *               location:
 *                 type: string
 *                 example: "Indoor"
 *               notes:
 *                 type: string
 *                 example: "Near window"
 *     responses:
 *       201:
 *         description: Table created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Table'
 *       400:
 *         description: Table number already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized (Admin/Manager only)
 */
router.route('/')
  .get(apiLimiter, getAllTables)
  .post(apiLimiter, authorize('Admin', 'Manager'), createTable);

/**
 * @swagger
 * /api/tables/{id}:
 *   get:
 *     summary: Get table by ID
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     responses:
 *       200:
 *         description: Table details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Table'
 *       404:
 *         description: Table not found
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update table
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableNumber:
 *                 type: string
 *                 example: "T-02"
 *               capacity:
 *                 type: integer
 *                 example: 6
 *               location:
 *                 type: string
 *                 example: "Outdoor"
 *               status:
 *                 type: string
 *                 enum: [available, occupied, reserved, maintenance]
 *               isActive:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Table updated successfully
 *       400:
 *         description: Table number already exists
 *       404:
 *         description: Table not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized (Admin/Manager only)
 *   delete:
 *     summary: Delete table
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     responses:
 *       200:
 *         description: Table deleted successfully
 *       400:
 *         description: Cannot delete table with active orders
 *       404:
 *         description: Table not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized (Admin only)
 */
router.route('/:id')
  .get(apiLimiter, getTableById)
  .put(apiLimiter, authorize('Admin', 'Manager'), updateTable)
  .delete(apiLimiter, authorize('Admin'), deleteTable);

/**
 * @swagger
 * /api/tables/{id}/assign:
 *   post:
 *     summary: Assign an order to a table
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - saleId
 *             properties:
 *               saleId:
 *                 type: integer
 *                 description: ID of the sale/order to assign
 *                 example: 123
 *     responses:
 *       200:
 *         description: Order assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sale:
 *                       type: object
 *                     table:
 *                       $ref: '#/components/schemas/Table'
 *       400:
 *         description: Table is not available
 *       404:
 *         description: Table or order not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/assign', apiLimiter, assignOrderToTable);

/**
 * @swagger
 * /api/tables/{id}/release:
 *   post:
 *     summary: Release a table (mark as available)
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     responses:
 *       200:
 *         description: Table released successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Table'
 *       400:
 *         description: Cannot release table with active orders
 *       404:
 *         description: Table not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/release', apiLimiter, releaseTable);

/**
 * @swagger
 * /api/tables/{id}/orders:
 *   get:
 *     summary: Get all orders for a specific table
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     responses:
 *       200:
 *         description: Table orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     table:
 *                       $ref: '#/components/schemas/Table'
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Table not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/orders', apiLimiter, getTableOrders);

module.exports = router;
