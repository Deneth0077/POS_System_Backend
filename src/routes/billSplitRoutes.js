const express = require('express');
const router = express.Router();
const {
  createBillSplit,
  getSaleSplits,
  getSplitById,
  paySplit,
  deleteSaleSplits,
  updateSplit,
  getSplitsSummary
} = require('../controllers/billSplitController');

const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply protection to all routes
router.use(protect);

/**
 * @swagger
 * components:
 *   schemas:
 *     BillSplit:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         saleId:
 *           type: integer
 *         splitNumber:
 *           type: integer
 *         customerName:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             type: object
 *         subtotal:
 *           type: number
 *           format: decimal
 *         vatAmount:
 *           type: number
 *           format: decimal
 *         totalAmount:
 *           type: number
 *           format: decimal
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, cancelled]
 *         paymentMethod:
 *           type: string
 *           enum: [cash, card, mobile, other]
 *         amountPaid:
 *           type: number
 *         changeGiven:
 *           type: number
 *         paidAt:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 */

/**
 * @swagger
 * /api/sales/splits/summary:
 *   get:
 *     summary: Get payment summary for all splits
 *     tags: [Bill Splits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, cancelled]
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 */
router.get('/splits/summary', apiLimiter, getSplitsSummary);

/**
 * @swagger
 * /api/sales/splits/{id}:
 *   get:
 *     summary: Get split by ID
 *     tags: [Bill Splits]
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
 *         description: Split details
 *       404:
 *         description: Split not found
 *   put:
 *     summary: Update split details
 *     tags: [Bill Splits]
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
 *               customerName:
 *                 type: string
 *                 example: "John Doe"
 *               notes:
 *                 type: string
 *                 example: "VIP customer"
 *     responses:
 *       200:
 *         description: Split updated
 *       400:
 *         description: Cannot update paid split
 *       404:
 *         description: Split not found
 */
router.route('/splits/:id')
  .get(apiLimiter, getSplitById)
  .put(apiLimiter, authorize('Admin', 'Manager'), updateSplit);

/**
 * @swagger
 * /api/sales/splits/{id}/pay:
 *   post:
 *     summary: Pay a bill split
 *     tags: [Bill Splits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Split ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - amountPaid
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, mobile, other]
 *                 example: cash
 *               amountPaid:
 *                 type: number
 *                 example: 500.00
 *     responses:
 *       200:
 *         description: Split paid successfully
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
 *                     split:
 *                       $ref: '#/components/schemas/BillSplit'
 *                     changeGiven:
 *                       type: number
 *                     allSplitsPaid:
 *                       type: boolean
 *       400:
 *         description: Already paid or insufficient amount
 *       404:
 *         description: Split not found
 */
router.post('/splits/:id/pay', apiLimiter, paySplit);

/**
 * @swagger
 * /api/sales/{id}/split:
 *   post:
 *     summary: Split a bill into multiple parts
 *     tags: [Bill Splits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sale ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - splits
 *             properties:
 *               splits:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   required:
 *                     - totalAmount
 *                   properties:
 *                     customerName:
 *                       type: string
 *                       example: "Customer 1"
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example: []
 *                     subtotal:
 *                       type: number
 *                       example: 434.78
 *                     vatAmount:
 *                       type: number
 *                       example: 65.22
 *                     totalAmount:
 *                       type: number
 *                       example: 500.00
 *                     notes:
 *                       type: string
 *                       example: "Split 1 of 2"
 *           example:
 *             splits:
 *               - customerName: "Customer 1"
 *                 subtotal: 434.78
 *                 vatAmount: 65.22
 *                 totalAmount: 500.00
 *               - customerName: "Customer 2"
 *                 subtotal: 434.78
 *                 vatAmount: 65.22
 *                 totalAmount: 500.00
 *     responses:
 *       201:
 *         description: Bill split successfully
 *       400:
 *         description: Invalid split amounts or already split
 *       404:
 *         description: Sale not found
 */
router.post('/:id/split', apiLimiter, createBillSplit);

/**
 * @swagger
 * /api/sales/{id}/splits:
 *   get:
 *     summary: Get all splits for a sale
 *     tags: [Bill Splits]
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
 *         description: List of splits with summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalAmount:
 *                       type: number
 *                     totalPaid:
 *                       type: number
 *                     totalPending:
 *                       type: number
 *                     allPaid:
 *                       type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BillSplit'
 *       404:
 *         description: Sale not found
 *   delete:
 *     summary: Delete all splits for a sale
 *     tags: [Bill Splits]
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
 *         description: Splits deleted successfully
 *       400:
 *         description: Cannot delete paid splits
 *       404:
 *         description: Sale not found
 */
router.route('/:id/splits')
  .get(apiLimiter, getSaleSplits)
  .delete(apiLimiter, authorize('Admin', 'Manager'), deleteSaleSplits);

module.exports = router;
