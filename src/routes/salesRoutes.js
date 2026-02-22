const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createSale,
  getSales,
  getSaleById,
  getSalesReport,
  calculateVAT,
  getSaleVATBreakdown,
  generateVATReport,
  generatePeriodVATReport,
  exportVATReportCSV,
  updateOrderStatus,
  cancelOrder,
  completeOrder,
  updateSaleStatus
} = require('../controllers/salesController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { apiLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../config/roles');

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales transaction management with 15% VAT calculation
 */

// Validation rules
const createSaleValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items array is required and must not be empty'),
  body('items.*.product').notEmpty().withMessage('Product ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('paymentMethod').optional().isIn(['cash', 'card', 'mobile', 'other']).withMessage('Invalid payment method'),
  body('amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
  body('orderType').optional().isIn(['dine-in', 'takeaway', 'delivery']).withMessage('Invalid order type. Must be dine-in, takeaway, or delivery'),
  body('kitchenStationId').optional({ nullable: true }).isInt().withMessage('Kitchen station ID must be an integer'),
  body('tableId').optional({ nullable: true }).isInt().withMessage('Table ID must be an integer'),
  body('tableNumber').optional({ nullable: true }).isString().withMessage('Table number must be a string')
];

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Create new sale
 *     description: Process a new sale transaction with automatic VAT calculation (15%). Accessible by all authenticated users.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - amountPaid
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - product
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     product:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       example: 2
 *                     unitPrice:
 *                       type: number
 *                       format: decimal
 *                       example: 150.00
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, mobile, other]
 *                 default: cash
 *                 example: cash
 *               amountPaid:
 *                 type: number
 *                 format: decimal
 *                 example: 500.00
 *               orderType:
 *                 type: string
 *                 enum: [dine-in, takeaway, delivery]
 *                 default: takeaway
 *                 example: takeaway
 *               tableId:
 *                 type: integer
 *                 example: 5
 *                 description: Table ID for dine-in orders
 *               tableNumber:
 *                 type: string
 *                 example: "T-12"
 *                 description: Table number for dine-in orders
 *               kitchenStationId:
 *                 type: integer
 *                 example: 5
 *                 description: Kitchen station ID where order is placed
 *               customerName:
 *                 type: string
 *                 example: John Doe
 *               customerPhone:
 *                 type: string
 *                 example: "+94771234567"
 *               specialInstructions:
 *                 type: string
 *                 example: "No onions, extra spicy"
 *     responses:
 *       201:
 *         description: Sale created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 */
router.post('/', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), createSaleValidation, validate, createSale);

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get all sales
 *     description: Retrieve list of sales with pagination. Requires Admin or Manager role.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sales from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sales to date
 *       - in: query
 *         name: cashier
 *         schema:
 *           type: integer
 *         description: Filter by cashier ID
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin or Manager role
 */
router.get('/', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), getSales);

/**
 * @swagger
 * /api/sales/report:
 *   get:
 *     summary: Get sales report
 *     description: Generate comprehensive sales report with analytics. Requires Admin or Manager role.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Report start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Report end date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Group results by time period
 *     responses:
 *       200:
 *         description: Sales report generated successfully
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
 *                     totalSales:
 *                       type: number
 *                       example: 15000.00
 *                     totalVAT:
 *                       type: number
 *                       example: 1956.52
 *                     totalTransactions:
 *                       type: integer
 *                       example: 45
 *                     averageTransaction:
 *                       type: number
 *                       example: 333.33
 *                     topProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin or Manager role
 */
router.get('/report', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), getSalesReport);

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     summary: Get sale by ID
 *     description: Retrieve detailed information about a specific sale transaction
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     responses:
 *       200:
 *         description: Sale retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *       404:
 *         description: Sale not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), getSaleById);

/**
 * @swagger
 * /api/sales/{id}:
 *   patch:
 *     summary: Update sale status
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [completed, voided, pending]
 *     responses:
 *       200:
 *         description: Sale updated successfully
 */
router.patch('/:id', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), updateSaleStatus);
router.patch('/:id/status', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), updateSaleStatus);

/**
 * @swagger
 * /api/sales/vat/calculate:
 *   post:
 *     summary: Calculate VAT for items
 *     description: Calculate VAT (15%) for a list of items before creating a sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: integer
 *                       description: Product ID
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     unitPrice:
 *                       type: number
 *                       minimum: 0
 *     responses:
 *       200:
 *         description: VAT calculated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/vat/calculate', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), calculateVAT);

/**
 * @swagger
 * /api/sales/{id}/vat:
 *   get:
 *     summary: Get VAT breakdown for a sale
 *     description: Get detailed VAT breakdown and validation for a specific sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     responses:
 *       200:
 *         description: VAT breakdown retrieved successfully
 *       404:
 *         description: Sale not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/vat', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), getSaleVATBreakdown);

/**
 * @swagger
 * /api/sales/reports/vat:
 *   get:
 *     summary: Generate VAT compliance report
 *     description: Generate comprehensive VAT report for a date range for tax compliance
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Group results by period
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: boolean
 *         description: Include individual sale details
 *     responses:
 *       200:
 *         description: VAT report generated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Manager or Admin role
 */
router.get('/reports/vat', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), generateVATReport);

/**
 * @swagger
 * /api/sales/reports/vat/{period}:
 *   get:
 *     summary: Generate VAT report for specific period
 *     description: Generate VAT report for daily, monthly, or quarterly period
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, monthly, quarterly]
 *         description: Report period
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Reference date (defaults to today)
 *     responses:
 *       200:
 *         description: Period VAT report generated successfully
 *       400:
 *         description: Invalid period
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Manager or Admin role
 */
router.get('/reports/vat/:period', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), generatePeriodVATReport);

/**
 * @swagger
 * /api/sales/reports/vat/export/csv:
 *   get:
 *     summary: Export VAT report to CSV
 *     description: Export VAT compliance report as CSV file
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Group results by period
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Manager or Admin role
 */
router.get('/reports/vat/export/csv', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), exportVATReportCSV);

/**
 * @swagger
 * /api/sales/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Update order status with optional cancellation/completion reason
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, preparing, ready, completed, voided]
 *               cancellationReason:
 *                 type: string
 *                 description: Required when status is 'voided'
 *               cancellationNote:
 *                 type: string
 *               completionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Sale not found
 */
router.patch('/:id/status', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), updateOrderStatus);

/**
 * @swagger
 * /api/sales/{id}/cancel:
 *   patch:
 *     summary: Cancel order with reason
 *     description: Cancel an order by marking it as voided with a required reason
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellationReason
 *             properties:
 *               cancellationReason:
 *                 type: string
 *               cancellationNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Invalid request or order cannot be cancelled
 *       404:
 *         description: Sale not found
 */
router.patch('/:id/cancel', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), cancelOrder);

/**
 * @swagger
 * /api/sales/{id}/complete:
 *   patch:
 *     summary: Complete order with optional reason
 *     description: Mark an order as completed with optional completion reason
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
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
 *               completionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order completed successfully
 *       400:
 *         description: Order cannot be completed
 *       404:
 *         description: Sale not found
 */
router.patch('/:id/complete', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), completeOrder);

module.exports = router;
