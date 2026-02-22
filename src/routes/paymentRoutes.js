const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const cardPaymentController = require('../controllers/cardPaymentController');
const mobilePaymentController = require('../controllers/mobilePaymentController');
const payHereController = require('../controllers/payHereController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   - name: Cash Payments
 *     description: Cash payment processing and cash drawer management
 *   - name: Card Payments
 *     description: Card payment gateway integration and processing
 *   - name: Mobile Payments
 *     description: QR code and mobile wallet payment processing
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CashPayment:
 *       type: object
 *       properties:
 *         transactionId:
 *           type: string
 *           example: CASH-1702841234567-1234
 *         saleNumber:
 *           type: string
 *           example: SALE-20251217-0001
 *         amount:
 *           type: number
 *           format: decimal
 *           example: 1500.00
 *         amountPaid:
 *           type: number
 *           format: decimal
 *           example: 2000.00
 *         changeGiven:
 *           type: number
 *           format: decimal
 *           example: 500.00
 *         paymentMethod:
 *           type: string
 *           example: cash
 *         timestamp:
 *           type: string
 *           format: date-time
 *         receiptNumber:
 *           type: string
 *           example: SALE-20251217-0001
 *     
 *     CashDrawer:
 *       type: object
 *       properties:
 *         drawerId:
 *           type: integer
 *           example: 1
 *         cashierId:
 *           type: integer
 *           example: 5
 *         cashierName:
 *           type: string
 *           example: John Doe
 *         openingBalance:
 *           type: number
 *           format: decimal
 *           example: 5000.00
 *         currentBalance:
 *           type: number
 *           format: decimal
 *           example: 12500.00
 *         totalCashIn:
 *           type: number
 *           format: decimal
 *           example: 8000.00
 *         totalCashOut:
 *           type: number
 *           format: decimal
 *           example: 500.00
 *         expectedBalance:
 *           type: number
 *           format: decimal
 *           example: 12500.00
 *         variance:
 *           type: number
 *           format: decimal
 *           example: 0.00
 *         status:
 *           type: string
 *           enum: [open, closed, reconciled]
 *           example: open
 *         openedAt:
 *           type: string
 *           format: date-time
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *     
 *     Denomination:
 *       type: object
 *       properties:
 *         value:
 *           type: number
 *           format: decimal
 *           enum: [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.25, 0.10, 0.05]
 *           example: 1000
 *         count:
 *           type: integer
 *           example: 5
 */

/**
 * @swagger
 * /api/payments/cash/process:
 *   post:
 *     summary: Process a cash payment transaction
 *     description: Process cash payment for a sale with denomination validation and change calculation
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - amountPaid
 *             properties:
 *               saleId:
 *                 type: integer
 *                 description: Existing sale ID (optional if creating new sale)
 *                 example: 123
 *               items:
 *                 type: array
 *                 description: Sale items (required if no saleId)
 *                 items:
 *                   type: object
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: Total amount to be paid
 *                 example: 1500.00
 *               amountPaid:
 *                 type: number
 *                 format: decimal
 *                 description: Amount paid by customer
 *                 example: 2000.00
 *               denominations:
 *                 type: array
 *                 description: Cash denomination breakdown (optional)
 *                 items:
 *                   $ref: '#/components/schemas/Denomination'
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *                 example: Customer paid in large bills
 *     responses:
 *       201:
 *         description: Cash payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Cash payment processed successfully
 *                 data:
 *                   $ref: '#/components/schemas/CashPayment'
 *       400:
 *         description: Invalid input or insufficient payment
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.post(
  '/cash/process',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('saleId').optional().isInt().withMessage('Sale ID must be an integer'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
    body('denominations').optional().isArray().withMessage('Denominations must be an array'),
    body('notes').optional().isString().trim()
  ],
  validate,
  paymentController.processCashPayment
);

/**
 * @swagger
 * /api/payments/cash/validate:
 *   post:
 *     summary: Validate cash denomination and amount
 *     description: Validate that cash denominations add up to the expected total
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - denominations
 *             properties:
 *               denominations:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Denomination'
 *               expectedTotal:
 *                 type: number
 *                 format: decimal
 *                 description: Expected total amount (optional)
 *                 example: 5000.00
 *     responses:
 *       200:
 *         description: Validation result
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
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     calculatedTotal:
 *                       type: number
 *                       format: decimal
 *                       example: 5000.00
 *                     expectedTotal:
 *                       type: number
 *                       format: decimal
 *                       example: 5000.00
 *                     difference:
 *                       type: number
 *                       format: decimal
 *                       example: 0.00
 *                     breakdown:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Denomination'
 *       400:
 *         description: Invalid denominations
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/cash/validate',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('denominations').isArray({ min: 1 }).withMessage('Denominations must be a non-empty array'),
    body('expectedTotal').optional().isFloat({ min: 0 }).withMessage('Expected total must be a positive number')
  ],
  validate,
  paymentController.validateCashDenominations
);

/**
 * @swagger
 * /api/payments/cash/drawer:
 *   get:
 *     summary: Get current cash drawer status
 *     description: Retrieve the status of cash drawer for a cashier
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cashierId
 *         schema:
 *           type: integer
 *         description: Cashier ID (optional, defaults to current user)
 *       - in: query
 *         name: shiftId
 *         schema:
 *           type: integer
 *         description: Shift ID (optional)
 *     responses:
 *       200:
 *         description: Cash drawer status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CashDrawer'
 *       404:
 *         description: No cash drawer found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Cannot view other cashiers' drawers
 */
router.get(
  '/cash/drawer',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    query('cashierId').optional().isInt().withMessage('Cashier ID must be an integer'),
    query('shiftId').optional().isInt().withMessage('Shift ID must be an integer')
  ],
  validate,
  paymentController.getCashDrawerStatus
);

/**
 * @swagger
 * /api/payments/cash/drawer/open:
 *   post:
 *     summary: Open cash drawer for a shift
 *     description: Open a new cash drawer with starting balance
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - openingBalance
 *             properties:
 *               openingBalance:
 *                 type: number
 *                 format: decimal
 *                 description: Starting cash balance
 *                 example: 5000.00
 *               denominations:
 *                 type: array
 *                 description: Opening cash denomination breakdown (optional)
 *                 items:
 *                   $ref: '#/components/schemas/Denomination'
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *                 example: Morning shift opening
 *     responses:
 *       201:
 *         description: Cash drawer opened successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Cash drawer opened successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     drawerId:
 *                       type: integer
 *                       example: 1
 *                     cashierId:
 *                       type: integer
 *                       example: 5
 *                     openingBalance:
 *                       type: number
 *                       format: decimal
 *                       example: 5000.00
 *                     openedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input or cashier already has an open drawer
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/cash/drawer/open',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('openingBalance').isFloat({ min: 0 }).withMessage('Opening balance must be a positive number'),
    body('denominations').optional().isArray().withMessage('Denominations must be an array'),
    body('notes').optional().isString().trim()
  ],
  validate,
  paymentController.openCashDrawer
);

/**
 * @swagger
 * /api/payments/cash/drawer/close:
 *   post:
 *     summary: Close cash drawer and reconcile
 *     description: Close cash drawer at end of shift with final cash count and reconciliation
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - drawerId
 *               - closingBalance
 *               - actualCash
 *             properties:
 *               drawerId:
 *                 type: integer
 *                 description: Cash drawer ID
 *                 example: 1
 *               closingBalance:
 *                 type: number
 *                 format: decimal
 *                 description: Calculated closing balance
 *                 example: 12500.00
 *               actualCash:
 *                 type: number
 *                 format: decimal
 *                 description: Physical cash counted
 *                 example: 12450.00
 *               denominations:
 *                 type: array
 *                 description: Closing cash denomination breakdown (optional)
 *                 items:
 *                   $ref: '#/components/schemas/Denomination'
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *                 example: Evening shift closing, minor shortage
 *     responses:
 *       200:
 *         description: Cash drawer closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Cash drawer closed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     drawerId:
 *                       type: integer
 *                       example: 1
 *                     expectedBalance:
 *                       type: number
 *                       format: decimal
 *                       example: 12500.00
 *                     actualBalance:
 *                       type: number
 *                       format: decimal
 *                       example: 12450.00
 *                     variance:
 *                       type: number
 *                       format: decimal
 *                       example: -50.00
 *                     totalSales:
 *                       type: integer
 *                       example: 25
 *                     totalAmount:
 *                       type: number
 *                       format: decimal
 *                       example: 8000.00
 *                     closedAt:
 *                       type: string
 *                       format: date-time
 *                     reconciliationReport:
 *                       type: object
 *       400:
 *         description: Invalid input or drawer not open
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cash drawer not found
 */
router.post(
  '/cash/drawer/close',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('drawerId').isInt().withMessage('Drawer ID must be an integer'),
    body('closingBalance').isFloat({ min: 0 }).withMessage('Closing balance must be a positive number'),
    body('actualCash').isFloat({ min: 0 }).withMessage('Actual cash must be a positive number'),
    body('denominations').optional().isArray().withMessage('Denominations must be an array'),
    body('notes').optional().isString().trim()
  ],
  validate,
  paymentController.closeCashDrawer
);

/**
 * @swagger
 * /api/payments/cash/refund:
 *   post:
 *     summary: Process cash refund
 *     description: Process a cash refund for a completed sale (Manager/Admin only)
 *     tags: [Cash Payments]
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
 *               - amount
 *               - reason
 *             properties:
 *               saleId:
 *                 type: integer
 *                 description: Original sale ID
 *                 example: 123
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: Refund amount
 *                 example: 1500.00
 *               reason:
 *                 type: string
 *                 description: Reason for refund
 *                 example: Damaged product returned by customer
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *                 example: Customer provided receipt
 *     responses:
 *       200:
 *         description: Cash refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Cash refund processed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     refundId:
 *                       type: integer
 *                       example: 456
 *                     transactionId:
 *                       type: string
 *                       example: REFUND-1702841234567-1234
 *                     saleId:
 *                       type: integer
 *                       example: 123
 *                     saleNumber:
 *                       type: string
 *                       example: SALE-20251217-0001
 *                     refundAmount:
 *                       type: number
 *                       format: decimal
 *                       example: 1500.00
 *                     refundedAt:
 *                       type: string
 *                       format: date-time
 *                     refundNumber:
 *                       type: string
 *                       example: REF-SALE-20251217-0001
 *       400:
 *         description: Invalid input or refund not allowed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only Manager/Admin can process refunds
 *       404:
 *         description: Sale not found
 */
router.post(
  '/cash/refund',
  protect,
  authorize('Admin', 'Manager'),
  [
    body('saleId').isInt().withMessage('Sale ID must be an integer'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Refund amount must be greater than zero'),
    body('reason').notEmpty().trim().withMessage('Refund reason is required'),
    body('notes').optional().isString().trim()
  ],
  validate,
  paymentController.processCashRefund
);

// ============================================================================
// CARD PAYMENT ROUTES
// ============================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     CardPaymentSession:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           example: cs_1702841234567_12345
 *         paymentIntentId:
 *           type: string
 *           example: pi_1702841234567_12345
 *         amount:
 *           type: number
 *           format: decimal
 *           example: 1500.00
 *         currency:
 *           type: string
 *           example: LKR
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, expired]
 *           example: pending
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         clientSecret:
 *           type: string
 *           example: secret_1702841234567
 *     
 *     CardPaymentResult:
 *       type: object
 *       properties:
 *         transactionId:
 *           type: string
 *           example: CARD-1702841234567-1234
 *         paymentId:
 *           type: integer
 *           example: 123
 *         saleNumber:
 *           type: string
 *           example: CARD-456
 *         amount:
 *           type: number
 *           format: decimal
 *           example: 1500.00
 *         cardLast4:
 *           type: string
 *           example: 4242
 *         cardBrand:
 *           type: string
 *           example: Visa
 *         status:
 *           type: string
 *           example: completed
 *         authorizationCode:
 *           type: string
 *           example: AUTH123456
 *         timestamp:
 *           type: string
 *           format: date-time
 *         receiptNumber:
 *           type: string
 *           example: CARD-456
 */

/**
 * @swagger
 * /api/payments/card/initialize:
 *   post:
 *     summary: Initialize card payment session
 *     description: Create a new card payment session and get client secret for frontend SDK
 *     tags: [Card Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               saleId:
 *                 type: integer
 *                 description: Existing sale ID (optional)
 *                 example: 123
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: Payment amount
 *                 example: 1500.00
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 default: LKR
 *                 example: LKR
 *               cardType:
 *                 type: string
 *                 description: Expected card type (optional)
 *                 example: visa
 *               returnUrl:
 *                 type: string
 *                 description: Return URL after payment
 *                 example: https://pos.example.com/payment/complete
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: Payment session initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CardPaymentSession'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/card/initialize',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('saleId').optional().isInt().withMessage('Sale ID must be an integer'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
    body('currency').optional().isString().trim(),
    body('cardType').optional().isString().trim(),
    body('returnUrl').optional().isURL().withMessage('Invalid return URL'),
    body('metadata').optional().isObject()
  ],
  validate,
  cardPaymentController.initializeCardPayment
);

/**
 * @swagger
 * /api/payments/card/process:
 *   post:
 *     summary: Process card payment transaction
 *     description: Process card payment using session ID and card details
 *     tags: [Card Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - cardDetails
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Payment session ID
 *                 example: cs_1702841234567_12345
 *               cardDetails:
 *                 type: object
 *                 required:
 *                   - last4
 *                   - brand
 *                 properties:
 *                   last4:
 *                     type: string
 *                     example: "4242"
 *                   brand:
 *                     type: string
 *                     example: Visa
 *                   expiryMonth:
 *                     type: integer
 *                     example: 12
 *                   expiryYear:
 *                     type: integer
 *                     example: 2025
 *               billingDetails:
 *                 type: object
 *                 description: Billing details (optional)
 *               saveCard:
 *                 type: boolean
 *                 description: Save card for future use
 *                 default: false
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Card payment processed successfully
 *                 data:
 *                   $ref: '#/components/schemas/CardPaymentResult'
 *       400:
 *         description: Invalid input or payment failed
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/card/process',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('sessionId').notEmpty().trim().withMessage('Session ID is required'),
    body('cardDetails').isObject().withMessage('Card details must be an object'),
    body('cardDetails.last4').isString().isLength({ min: 4, max: 4 }).withMessage('Card last4 must be 4 digits'),
    body('cardDetails.brand').notEmpty().trim().withMessage('Card brand is required'),
    body('cardDetails.expiryMonth').optional().isInt({ min: 1, max: 12 }),
    body('cardDetails.expiryYear').optional().isInt({ min: 2025 }),
    body('billingDetails').optional().isObject(),
    body('saveCard').optional().isBoolean()
  ],
  validate,
  cardPaymentController.processCardPayment
);

/**
 * @swagger
 * /api/payments/card/status/{sessionId}:
 *   get:
 *     summary: Check card payment status
 *     description: Get the current status of a card payment session
 *     tags: [Card Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment session ID
 *     responses:
 *       200:
 *         description: Payment status retrieved
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
 *                     sessionId:
 *                       type: string
 *                       example: cs_1702841234567_12345
 *                     status:
 *                       type: string
 *                       example: completed
 *                     amount:
 *                       type: number
 *                       example: 1500.00
 *                     currency:
 *                       type: string
 *                       example: LKR
 *                     transactionId:
 *                       type: string
 *                       example: CARD-1702841234567-1234
 *                     failureReason:
 *                       type: string
 *                       nullable: true
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/card/status/:sessionId',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    param('sessionId').notEmpty().trim().withMessage('Session ID is required')
  ],
  validate,
  cardPaymentController.getCardPaymentStatus
);

/**
 * @swagger
 * /api/payments/card/verify:
 *   post:
 *     summary: Verify card payment webhook
 *     description: Webhook endpoint for payment gateway callbacks (public endpoint with signature verification)
 *     tags: [Card Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - paymentIntentId
 *               - status
 *               - signature
 *             properties:
 *               eventType:
 *                 type: string
 *                 example: payment.completed
 *               paymentIntentId:
 *                 type: string
 *                 example: pi_1702841234567_12345
 *               status:
 *                 type: string
 *                 example: completed
 *               amount:
 *                 type: number
 *                 example: 1500.00
 *               metadata:
 *                 type: object
 *               signature:
 *                 type: string
 *                 example: sha256_signature_string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data or signature
 */
router.post(
  '/card/verify',
  [
    body('eventType').notEmpty().trim().withMessage('Event type is required'),
    body('paymentIntentId').notEmpty().trim().withMessage('Payment intent ID is required'),
    body('status').notEmpty().trim().withMessage('Status is required'),
    body('signature').notEmpty().trim().withMessage('Signature is required')
  ],
  validate,
  cardPaymentController.verifyCardPaymentWebhook
);

/**
 * @swagger
 * /api/payments/card/refund:
 *   post:
 *     summary: Process card refund
 *     description: Initiate a refund for a card payment (Manager/Admin only)
 *     tags: [Card Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - amount
 *               - reason
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: Original transaction ID
 *                 example: CARD-1702841234567-1234
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 description: Refund amount (partial or full)
 *                 example: 1500.00
 *               reason:
 *                 type: string
 *                 description: Reason for refund
 *                 example: Customer requested refund - product defect
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Refund initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Card refund initiated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     refundId:
 *                       type: integer
 *                       example: 456
 *                     transactionId:
 *                       type: string
 *                       example: REFUND-1702841234567-1234
 *                     refundAmount:
 *                       type: number
 *                       example: 1500.00
 *                     status:
 *                       type: string
 *                       example: completed
 *                     estimatedArrival:
 *                       type: string
 *                       example: 5-10 business days
 *                     refundedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input or refund not allowed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only Manager/Admin
 *       404:
 *         description: Transaction not found
 */
router.post(
  '/card/refund',
  protect,
  authorize('Admin', 'Manager'),
  [
    body('transactionId').notEmpty().trim().withMessage('Transaction ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Refund amount must be greater than zero'),
    body('reason').notEmpty().trim().withMessage('Refund reason is required'),
    body('notes').optional().isString().trim()
  ],
  validate,
  cardPaymentController.processCardRefund
);

/**
 * @swagger
 * /api/payments/card/transactions:
 *   get:
 *     summary: List card payment transactions
 *     description: Get paginated list of card payment transactions with filters (Manager/Admin only)
 *     tags: [Card Payments]
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
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: cardBrand
 *         schema:
 *           type: string
 *         description: Filter by card brand (Visa, Mastercard, etc.)
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
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
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           transactionId:
 *                             type: string
 *                           saleNumber:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           cardBrand:
 *                             type: string
 *                           cardLast4:
 *                             type: string
 *                           status:
 *                             type: string
 *                           authorizationCode:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only Manager/Admin
 */
router.get(
  '/card/transactions',
  protect,
  authorize('Admin', 'Manager'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isString().trim(),
    query('cardBrand').optional().isString().trim()
  ],
  validate,
  cardPaymentController.getCardTransactions
);

/**
 * @swagger
 * /api/payments/card/cancel:
 *   post:
 *     summary: Cancel pending card payment
 *     description: Cancel a pending or processing card payment session
 *     tags: [Card Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Payment session ID to cancel
 *                 example: cs_1702841234567_12345
 *               reason:
 *                 type: string
 *                 description: Cancellation reason (optional)
 *                 example: Customer changed mind
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Card payment cancelled successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                       example: cs_1702841234567_12345
 *                     status:
 *                       type: string
 *                       example: cancelled
 *                     cancelledAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Cannot cancel payment in current status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
router.post(
  '/card/cancel',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('sessionId').notEmpty().trim().withMessage('Session ID is required'),
    body('reason').optional().isString().trim()
  ],
  validate,
  cardPaymentController.cancelCardPayment
);

// ============================================================================
// MOBILE/QR PAYMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/payments/mobile/qr/generate:
 *   post:
 *     tags: [Mobile Payments]
 *     summary: Generate QR code for mobile wallet payment
 *     description: Creates a QR payment session for mobile wallet scanning
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - walletType
 *             properties:
 *               saleId:
 *                 type: integer
 *                 example: 1
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 example: 5500.00
 *               currency:
 *                 type: string
 *                 default: LKR
 *                 example: LKR
 *               walletType:
 *                 type: string
 *                 enum: [genie, frimi, payhere, ezcash, mcash]
 *                 example: genie
 *               expiryMinutes:
 *                 type: integer
 *                 default: 10
 *                 example: 10
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrId:
 *                       type: string
 *                     qrCode:
 *                       type: string
 *                       description: Base64 encoded QR code image
 *                     qrData:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     walletType:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/mobile/qr/generate',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('saleId').optional().isInt().withMessage('Sale ID must be an integer'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('walletType').notEmpty().isIn(['genie', 'frimi', 'payhere', 'ezcash', 'mcash']).withMessage('Invalid wallet type'),
    body('expiryMinutes').optional().isInt({ min: 1, max: 60 }).withMessage('Expiry must be between 1 and 60 minutes')
  ],
  validate,
  mobilePaymentController.generateQRPayment
);

/**
 * @swagger
 * /api/payments/mobile/process:
 *   post:
 *     tags: [Mobile Payments]
 *     summary: Process mobile wallet payment
 *     description: Process payment via mobile wallet (QR-based or direct)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - walletType
 *               - phoneNumber
 *             properties:
 *               qrId:
 *                 type: string
 *                 example: qr_1702841234567_12345
 *               saleId:
 *                 type: integer
 *                 example: 1
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 example: 5500.00
 *               walletType:
 *                 type: string
 *                 example: genie
 *               phoneNumber:
 *                 type: string
 *                 example: +94771234567
 *               transactionRef:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
 *                     transactionId:
 *                       type: string
 *                     paymentId:
 *                       type: string
 *                     saleNumber:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     walletType:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                     transactionRef:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error or payment failed
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/mobile/process',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('qrId').optional().isString().trim(),
    body('saleId').optional().isInt().withMessage('Sale ID must be an integer'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('walletType').notEmpty().withMessage('Wallet type is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required')
  ],
  validate,
  mobilePaymentController.processMobilePayment
);

/**
 * @swagger
 * /api/payments/mobile/status/{qrId}:
 *   get:
 *     tags: [Mobile Payments]
 *     summary: Check mobile wallet payment status
 *     description: Get real-time status of a mobile payment session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qrId
 *         required: true
 *         schema:
 *           type: string
 *         description: QR code ID or payment reference
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, expired, failed]
 *                     amount:
 *                       type: number
 *                     walletType:
 *                       type: string
 *                     transactionId:
 *                       type: string
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Payment session not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/mobile/status/:qrId',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  mobilePaymentController.getMobilePaymentStatus
);

/**
 * @swagger
 * /api/payments/mobile/verify:
 *   post:
 *     tags: [Mobile Payments]
 *     summary: Verify mobile wallet payment webhook
 *     description: Handle callback from mobile wallet provider
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - paymentId
 *               - status
 *               - signature
 *             properties:
 *               eventType:
 *                 type: string
 *                 example: payment.succeeded
 *               paymentId:
 *                 type: string
 *               status:
 *                 type: string
 *               amount:
 *                 type: number
 *               phoneNumber:
 *                 type: string
 *               walletType:
 *                 type: string
 *               transactionRef:
 *                 type: string
 *               signature:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid webhook signature
 */
router.post(
  '/mobile/verify',
  [
    body('eventType').notEmpty().withMessage('Event type is required'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('status').notEmpty().withMessage('Status is required'),
    body('signature').notEmpty().withMessage('Signature is required')
  ],
  validate,
  mobilePaymentController.verifyMobilePaymentWebhook
);

/**
 * @swagger
 * /api/payments/mobile/refund:
 *   post:
 *     tags: [Mobile Payments]
 *     summary: Process mobile wallet refund
 *     description: Initiate refund for mobile wallet payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - amount
 *               - walletType
 *               - phoneNumber
 *               - reason
 *             properties:
 *               transactionId:
 *                 type: string
 *                 example: MOB-1702841234567-1234
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 example: 2500.00
 *               walletType:
 *                 type: string
 *                 example: genie
 *               phoneNumber:
 *                 type: string
 *                 example: +94771234567
 *               reason:
 *                 type: string
 *                 example: Customer request
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund initiated successfully
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
 *                     refundId:
 *                       type: string
 *                     transactionId:
 *                       type: string
 *                     refundAmount:
 *                       type: number
 *                     walletType:
 *                       type: string
 *                     status:
 *                       type: string
 *                     estimatedArrival:
 *                       type: string
 *       400:
 *         description: Validation error or refund failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.post(
  '/mobile/refund',
  protect,
  authorize('Admin', 'Manager'),
  [
    body('transactionId').notEmpty().withMessage('Transaction ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('walletType').notEmpty().withMessage('Wallet type is required'),
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('reason').isString().isLength({ min: 3 }).withMessage('Reason must be at least 3 characters')
  ],
  validate,
  mobilePaymentController.processMobileRefund
);

/**
 * @swagger
 * /api/payments/mobile/wallets:
 *   get:
 *     tags: [Mobile Payments]
 *     summary: Get supported mobile wallet providers
 *     description: List all available mobile wallet providers and their details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of supported wallets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           name:
 *                             type: string
 *                           logo:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           supportedCurrencies:
 *                             type: array
 *                             items:
 *                               type: string
 *                           minAmount:
 *                             type: number
 *                           maxAmount:
 *                             type: number
 *                           processingFee:
 *                             type: number
 *                           processingFeeType:
 *                             type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/mobile/wallets',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  mobilePaymentController.getSupportedWallets
);

/**
 * @swagger
 * /api/payments/mobile/transactions:
 *   get:
 *     tags: [Mobile Payments]
 *     summary: List mobile wallet transactions
 *     description: Get paginated list of mobile wallet transactions with filters
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
 *         name: walletType
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Manager role required
 */
router.get(
  '/mobile/transactions',
  protect,
  authorize('Admin', 'Manager'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validate,
  mobilePaymentController.getMobileTransactions
);

/**
 * @swagger
 * /api/payments/mobile/cancel:
 *   post:
 *     tags: [Mobile Payments]
 *     summary: Cancel mobile payment session
 *     description: Cancel a pending mobile payment session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrId
 *             properties:
 *               qrId:
 *                 type: string
 *                 example: qr_1702841234567_12345
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
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
 *                     qrId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     cancelledAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error or cannot cancel
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/mobile/cancel',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('qrId').notEmpty().withMessage('QR ID is required'),
    body('reason').optional().isString().trim()
  ],
  validate,
  mobilePaymentController.cancelMobilePayment
);

// ============================================================================
// PAYMENT RECONCILIATION ROUTES
// ============================================================================

/**
 * @swagger
 * /api/payments/cash/drawer/reconcile:
 *   post:
 *     summary: Reconcile cash drawer
 *     description: Reconcile a closed cash drawer with actual cash count and mark discrepancies
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - drawerId
 *               - actualCash
 *             properties:
 *               drawerId:
 *                 type: integer
 *                 description: ID of the cash drawer to reconcile
 *                 example: 1
 *               actualCash:
 *                 type: number
 *                 format: decimal
 *                 description: Actual physical cash counted
 *                 example: 12450.50
 *               closingDenominations:
 *                 type: array
 *                 description: Breakdown of closing cash by denomination
 *                 items:
 *                   $ref: '#/components/schemas/Denomination'
 *               notes:
 *                 type: string
 *                 description: Reconciliation notes
 *                 example: "Short 50 LKR, likely gave wrong change"
 *     responses:
 *       200:
 *         description: Cash drawer reconciled successfully
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
 *                     drawerId:
 *                       type: integer
 *                     expectedBalance:
 *                       type: number
 *                     actualCash:
 *                       type: number
 *                     variance:
 *                       type: number
 *                     variancePercentage:
 *                       type: number
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid input or drawer not closed
 *       404:
 *         description: Drawer not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager/Admin only
 */
router.post(
  '/cash/drawer/reconcile',
  protect,
  authorize('Admin', 'Manager'),
  [
    body('drawerId').isInt().withMessage('Drawer ID must be an integer'),
    body('actualCash').isFloat({ min: 0 }).withMessage('Actual cash must be a positive number'),
    body('closingDenominations').optional().isArray().withMessage('Closing denominations must be an array'),
    body('notes').optional().isString().trim()
  ],
  validate,
  paymentController.reconcileCashDrawer
);

/**
 * @swagger
 * /api/payments/reconciliation/report:
 *   get:
 *     summary: Get reconciliation report
 *     description: Get detailed reconciliation report for cash drawers with filters
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for report
 *       - in: query
 *         name: cashierId
 *         schema:
 *           type: integer
 *         description: Filter by cashier ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed, reconciled]
 *         description: Filter by drawer status
 *     responses:
 *       200:
 *         description: Reconciliation report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalDrawers:
 *                           type: integer
 *                         totalVariance:
 *                           type: number
 *                         totalCashIn:
 *                           type: number
 *                         totalCashOut:
 *                           type: number
 *                     drawers:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager/Admin only
 */
router.get(
  '/reconciliation/report',
  protect,
  authorize('Admin', 'Manager'),
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('cashierId').optional().isInt().withMessage('Cashier ID must be an integer'),
    query('status').optional().isIn(['open', 'closed', 'reconciled']).withMessage('Invalid status')
  ],
  validate,
  paymentController.getReconciliationReport
);

/**
 * @swagger
 * /api/payments/reconciliation/discrepancies:
 *   get:
 *     summary: Get drawer discrepancies
 *     description: Get all cash drawers with variances above threshold
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           default: 10.00
 *         description: Minimum variance amount to flag
 *     responses:
 *       200:
 *         description: Discrepancies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     threshold:
 *                       type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalDiscrepancies:
 *                           type: integer
 *                         totalVariance:
 *                           type: number
 *                         shortages:
 *                           type: integer
 *                         overages:
 *                           type: integer
 *                     discrepancies:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager/Admin only
 */
router.get(
  '/reconciliation/discrepancies',
  protect,
  authorize('Admin', 'Manager'),
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('threshold').optional().isFloat({ min: 0 }).withMessage('Threshold must be a positive number')
  ],
  validate,
  paymentController.getDrawerDiscrepancies
);

/**
 * @swagger
 * /api/payments/transactions:
 *   get:
 *     summary: Get payment transaction history
 *     description: Get paginated list of all payment transactions with filters
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [cash, card, mobile]
 *       - in: query
 *         name: cashierId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, refunded, pending, failed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager/Admin only
 */
router.get(
  '/transactions',
  protect,
  authorize('Admin', 'Manager'),
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('paymentMethod').optional().isIn(['cash', 'card', 'mobile']).withMessage('Invalid payment method'),
    query('cashierId').optional().isInt().withMessage('Cashier ID must be an integer'),
    query('status').optional().isIn(['completed', 'refunded', 'pending', 'failed']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validate,
  paymentController.getPaymentTransactions
);

/**
 * @swagger
 * /api/payments/cash/drawer/summary:
 *   get:
 *     summary: Get drawer summary statistics
 *     description: Get aggregated statistics for cash drawers by status
 *     tags: [Cash Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Drawer summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: object
 *                       properties:
 *                         totalDrawers:
 *                           type: integer
 *                         totalCashIn:
 *                           type: number
 *                         totalCashOut:
 *                           type: number
 *                         totalVariance:
 *                           type: number
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager/Admin only
 */
router.get(
  '/cash/drawer/summary',
  protect,
  authorize('Admin', 'Manager'),
  [
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date')
  ],
  validate,
  paymentController.getDrawerSummary
);

// =====================
// Stripe Payment Routes
// =====================

/**
 * @swagger
 * /api/payments/stripe/config:
 *   get:
 *     summary: Get Stripe publishable key
 *     tags: [Stripe Payments]
 *     responses:
 *       200:
 *         description: Stripe configuration retrieved
 */
router.get(
  '/stripe/config',
  paymentController.getStripeConfig
);

/**
 * @swagger
 * /api/payments/stripe/create-payment-intent:
 *   post:
 *     summary: Create a Stripe payment intent
 *     tags: [Stripe Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to charge (in dollars)
 *               currency:
 *                 type: string
 *                 default: usd
 *               orderId:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment intent created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/stripe/create-payment-intent',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').optional().isString(),
    body('orderId').optional().isString(),
    body('metadata').optional().isObject()
  ],
  validate,
  paymentController.createStripePaymentIntent
);

/**
 * @swagger
 * /api/payments/stripe/confirm:
 *   post:
 *     summary: Confirm a Stripe payment
 *     tags: [Stripe Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       400:
 *         description: Payment failed or invalid
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/stripe/confirm',
  protect,
  authorize('Admin', 'Manager', 'Cashier'),
  [
    body('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required')
  ],
  validate,
  paymentController.confirmStripePayment
);

// ============================================================================
// PAYHERE PAYMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/payments/payhere/checkout:
 *   post:
 *     summary: Prepare PayHere checkout data
 *     tags: [PayHere Payments]
 */
router.post('/payhere/checkout', protect, payHereController.prepareCheckout);

/**
 * @swagger
 * /api/payments/payhere/notify:
 *   post:
 *     summary: Handle PayHere payment notification
 *     tags: [PayHere Payments]
 */
router.post('/payhere/notify', payHereController.handleNotification);

module.exports = router;
