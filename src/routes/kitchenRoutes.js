const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createKitchenOrder,
  getActiveOrders,
  getKitchenOrderById,
  updateOrderStatus,
  linkSaleToOrder,
  updateItemStatus,
  cancelKitchenOrder,
  updateKitchenOrder,
  notifyDelay,
  resetDelay,
  getOrdersByStation,
  getKitchenMetrics,
  createStation,
  getStations,
  getStationById,
  updateStation,
  deleteStation,
  getStationDashboard,
  uploadRecipe,
  getCompletedOrders
} = require('../controllers/kitchenController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { apiLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../config/roles');

/**
 * @swagger
 * tags:
 *   name: Kitchen
 *   description: Kitchen order routing and management
 */

// Validation rules
const createOrderValidation = [
  body('saleId').optional().isInt().withMessage('Sale ID must be an integer'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required with at least 1 item'),
  body('items.*.productId').optional().isInt().withMessage('Product ID must be an integer'),
  body('items.*.productName').optional().isString().withMessage('Product name must be a string'),
  body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').optional().isNumeric().withMessage('Unit price must be numeric'),
  body('orderType').optional().isIn(['dine-in', 'takeaway', 'delivery']).withMessage('Invalid order type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level')
];

const updateOrderStatusValidation = [
  body('status').isIn(['unpaid', 'pending', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('Invalid status')
];

const linkSaleValidation = [
  body('saleId').isInt().withMessage('Sale ID is required and must be an integer'),
  body('status').optional().isIn(['unpaid', 'pending', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('Invalid status')
];

const updateItemStatusValidation = [
  body('status').isIn(['pending', 'preparing', 'ready', 'completed']).withMessage('Invalid item status')
];

const createStationValidation = [
  body('name').notEmpty().withMessage('Station name is required'),
  body('code').notEmpty().withMessage('Station code is required'),
  body('productCategories').isArray().withMessage('Product categories must be an array')
];

/**
 * @swagger
 * /api/kitchen/orders:
 *   post:
 *     summary: Create a new kitchen order
 *     description: Create a kitchen order from a sale with automatic station routing
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - saleId
 *               - items
 *             properties:
 *               saleId:
 *                 type: integer
 *                 example: 1
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               orderType:
 *                 type: string
 *                 enum: [dine-in, takeaway, delivery]
 *               tableNumber:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *               specialInstructions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kitchen order created successfully
 */
router.post('/orders', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), createOrderValidation, validate, createKitchenOrder);

/**
 * @swagger
 * /api/kitchen/orders:
 *   get:
 *     summary: Get active kitchen orders
 *     description: Retrieve all active orders (pending, preparing, ready)
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: integer
 *         description: Filter by station ID
 *       - in: query
 *         name: orderType
 *         schema:
 *           type: string
 *           enum: [dine-in, takeaway, delivery]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/orders', apiLimiter, protect, getActiveOrders);

/**
 * @swagger
 * /api/kitchen/orders/completed:
 *   get:
 *     summary: Get completed kitchen orders
 *     description: Retrieve all completed orders with optional filtering
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: integer
 *         description: Filter by station ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/orders/completed', apiLimiter, protect, getCompletedOrders);

/**
 * @swagger
 * /api/kitchen/orders/{id}:
 *   get:
 *     summary: Get kitchen order by ID
 *     description: Retrieve detailed information about a specific kitchen order
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get('/orders/:id', apiLimiter, protect, getKitchenOrderById);

/**
 * @swagger
 * /api/kitchen/orders/{id}:
 *   put:
 *     summary: Update kitchen order
 *     description: Update items or details of a kitchen order
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order updated successfully
 */
router.put('/orders/:id', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), updateKitchenOrder);

/**
 * @swagger
 * /api/kitchen/orders/{id}/status:
 *   patch:
 *     summary: Update kitchen order status
 *     description: Update the status of a kitchen order (pending, preparing, ready, completed, cancelled)
 *     tags: [Kitchen]
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
 *                 enum: [pending, preparing, ready, completed, cancelled]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch('/orders/:id/status', apiLimiter, protect, updateOrderStatusValidation, validate, updateOrderStatus);

/**
 * @swagger
 * /api/kitchen/orders/{id}/link-sale:
 *   patch:
 *     summary: Link a sale to a kitchen order after payment
 *     description: Updates a kitchen order with the sale ID after payment is completed
 *     tags: [Kitchen]
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
 *               - saleId
 *             properties:
 *               saleId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [unpaid, pending, preparing, ready, completed, cancelled]
 *     responses:
 *       200:
 *         description: Sale linked successfully
 */
router.patch('/orders/:id/link-sale', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER), linkSaleValidation, validate, linkSaleToOrder);

/**
 * @swagger
 * /api/kitchen/orders/{id}/items/{itemIndex}/status:
 *   patch:
 *     summary: Update item status in kitchen order
 *     description: Update the status of a specific item within an order
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: itemIndex
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
 *                 enum: [pending, preparing, ready, completed]
 *     responses:
 *       200:
 *         description: Item status updated successfully
 */
router.patch('/orders/:id/items/:itemIndex/status', apiLimiter, protect, updateItemStatusValidation, validate, updateItemStatus);

/**
 * @swagger
 * /api/kitchen/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel kitchen order with reason
 *     description: Cancel a kitchen order from the kitchen dashboard with a mandatory reason
 *     tags: [Kitchen]
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
 */
router.patch('/orders/:id/cancel', apiLimiter, protect, cancelKitchenOrder);

/**
 * @swagger
 * /api/kitchen/orders/{id}/delay:
 *   patch:
 *     summary: Notify delay for kitchen order
 *     description: Report a delay in order preparation with reason and estimated additional time
 *     tags: [Kitchen]
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
 *               - delayReason
 *             properties:
 *               delayReason:
 *                 type: string
 *               estimatedDelay:
 *                 type: integer
 *                 description: Additional minutes needed
 *               preparationNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Delay notification sent successfully
 */
router.patch('/orders/:id/delay', apiLimiter, protect, notifyDelay);

/**
 * @swagger
 * /api/kitchen/orders/{id}/reset-delay:
 *   patch:
 *     summary: Reset delay notification for an order
 *     description: Clear delay information and reset order to normal status
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kitchen order ID
 *     responses:
 *       200:
 *         description: Delay notification reset successfully
 */
router.patch('/orders/:id/reset-delay', apiLimiter, protect, resetDelay);

/**
 * @swagger
 * /api/kitchen/metrics:
 *   get:
 *     summary: Get kitchen performance metrics
 *     description: Retrieve kitchen performance metrics for a date range
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 */
router.get('/metrics', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), getKitchenMetrics);

// KITCHEN STATION ROUTES

/**
 * @swagger
 * /api/kitchen/stations:
 *   post:
 *     summary: Create a new kitchen station
 *     description: Create a new kitchen station for order routing
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - productCategories
 *             properties:
 *               name:
 *                 type: string
 *                 example: Grill Station
 *               code:
 *                 type: string
 *                 example: GRL
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               priority:
 *                 type: integer
 *                 default: 0
 *               color:
 *                 type: string
 *                 example: "#FF5733"
 *               averagePrepTime:
 *                 type: integer
 *                 default: 10
 *               productCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Burgers", "Steaks"]
 *     responses:
 *       201:
 *         description: Station created successfully
 */
router.post('/stations', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), createStationValidation, validate, createStation);

/**
 * @swagger
 * /api/kitchen/stations:
 *   get:
 *     summary: Get all kitchen stations
 *     description: Retrieve all kitchen stations
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Stations retrieved successfully
 */
router.get('/stations', apiLimiter, protect, getStations);

/**
 * @swagger
 * /api/kitchen/stations/{id}:
 *   get:
 *     summary: Get kitchen station by ID
 *     description: Retrieve a specific kitchen station
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Station retrieved successfully
 *       404:
 *         description: Station not found
 */
router.get('/stations/:id', apiLimiter, protect, getStationById);

/**
 * @swagger
 * /api/kitchen/stations/{id}/orders:
 *   get:
 *     summary: Get orders by station
 *     description: Retrieve all active orders for a specific station
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/stations/:id/orders', apiLimiter, protect, getOrdersByStation);

/**
 * @swagger
 * /api/kitchen/stations/{id}/dashboard:
 *   get:
 *     summary: Get dashboard stats for station
 *     description: Retrieve inventory and production capability for a specific station
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 */
router.get('/stations/:id/dashboard', apiLimiter, protect, getStationDashboard);

/**
 * @swagger
 * /api/kitchen/stations/{id}:
 *   put:
 *     summary: Update kitchen station
 *     description: Update a kitchen station's details
 *     tags: [Kitchen]
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
 *     responses:
 *       200:
 *         description: Station updated successfully
 *       404:
 *         description: Station not found
 */
router.put('/stations/:id', apiLimiter, protect, authorize(ROLES.ADMIN, ROLES.MANAGER), updateStation);

/**
 * @swagger
 * /api/kitchen/stations/{id}:
 *   delete:
 *     summary: Delete kitchen station
 *     description: Delete a kitchen station
 *     tags: [Kitchen]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Station deleted successfully
 *       404:
 *         description: Station not found
 */
router.delete('/stations/:id', apiLimiter, protect, authorize(ROLES.ADMIN), deleteStation);


const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * /api/kitchen/stations/{id}/recipe:
 *   post:
 *     summary: Upload recipe file for a station
 *     description: Upload Excel/CSV recipe and create menu item
 *     tags: [Kitchen]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - name
 *               - price
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               preparationTime:
 *                 type: integer
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recipe uploaded successfully
 */
router.post('/stations/:id/recipe', protect, authorize(ROLES.ADMIN, ROLES.MANAGER), upload.single('file'), uploadRecipe);

module.exports = router;
