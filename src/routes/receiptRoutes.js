const express = require('express');
const router = express.Router();
const ReceiptController = require('../controllers/receiptController');
const { protect } = require('../middleware/auth');
const { body, query, param } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Receipts
 *   description: Receipt generation and management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Receipt:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         receiptNumber:
 *           type: string
 *         saleId:
 *           type: integer
 *         receiptType:
 *           type: string
 *           enum: [original, duplicate, refund, digital]
 *         format:
 *           type: string
 *           enum: [print, email, sms, pdf]
 *         language:
 *           type: string
 *           enum: [english, sinhala, tamil]
 *         orderType:
 *           type: string
 *           enum: [dine-in, takeaway, delivery]
 *         deliveryStatus:
 *           type: string
 *           enum: [pending, sent, delivered, failed, printed]
 *         generatedBy:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/receipts/audit:
 *   get:
 *     summary: Get receipt audit log
 *     tags: [Receipts]
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
 *         name: receiptType
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *       - in: query
 *         name: deliveryStatus
 *         schema:
 *           type: string
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
 *         description: Audit log retrieved successfully
 */
router.get(
  '/audit',
  protect,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  ReceiptController.getAuditLog
);

/**
 * @swagger
 * /api/receipts/stats:
 *   get:
 *     summary: Get receipt statistics
 *     tags: [Receipts]
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
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get(
  '/stats',
  protect,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  ReceiptController.getStatistics
);

/**
 * @swagger
 * /api/receipts:
 *   post:
 *     summary: Generate a new receipt
 *     tags: [Receipts]
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
 *             properties:
 *               saleId:
 *                 type: integer
 *                 description: ID of the sale
 *               receiptType:
 *                 type: string
 *                 enum: [original, duplicate, refund, digital]
 *                 default: original
 *               format:
 *                 type: string
 *                 enum: [print, email, sms, pdf]
 *                 default: print
 *               language:
 *                 type: string
 *                 enum: [english, sinhala, tamil]
 *                 default: english
 *               deliveryMethod:
 *                 type: string
 *                 description: Email address or phone number for digital receipts
 *     responses:
 *       201:
 *         description: Receipt generated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Sale not found
 */
router.post(
  '/',
  protect,
  body('saleId').isInt().withMessage('Sale ID must be an integer'),
  body('receiptType').optional().isIn(['original', 'duplicate', 'refund', 'digital']),
  body('format').optional().isIn(['print', 'email', 'sms', 'pdf']),
  body('language').optional().isIn(['english', 'sinhala', 'tamil']),
  body('deliveryMethod').optional().isString(),
  ReceiptController.generateReceipt
);

/**
 * @swagger
 * /api/receipts/{id}:
 *   get:
 *     summary: Get receipt by ID
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: includeTemplate
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Receipt retrieved successfully
 *       404:
 *         description: Receipt not found
 */
router.get(
  '/:id',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  query('includeTemplate').optional().isBoolean(),
  ReceiptController.getReceipt
);

/**
 * @swagger
 * /api/receipts/sale/{saleId}:
 *   get:
 *     summary: Get all receipts for a sale
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Receipts retrieved successfully
 */
router.get(
  '/sale/:saleId',
  protect,
  param('saleId').isInt().withMessage('Sale ID must be an integer'),
  ReceiptController.getReceiptsBySale
);

/**
 * @swagger
 * /api/receipts/{id}/duplicate:
 *   post:
 *     summary: Generate duplicate receipt
 *     tags: [Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Duplicate receipt generated successfully
 *       404:
 *         description: Original receipt not found
 */
router.post(
  '/:id/duplicate',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  ReceiptController.generateDuplicate
);

/**
 * @swagger
 * /api/receipts/{id}/void:
 *   post:
 *     summary: Void a receipt
 *     tags: [Receipts]
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Receipt voided successfully
 *       404:
 *         description: Receipt not found
 */
router.post(
  '/:id/void',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  body('reason').notEmpty().withMessage('Void reason is required'),
  ReceiptController.voidReceipt
);

/**
 * @swagger
 * /api/receipts/{id}/text:
 *   get:
 *     summary: Get receipt as plain text
 *     tags: [Receipts]
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
 *         description: Plain text receipt
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get(
  '/:id/text',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  ReceiptController.getReceiptText
);

/**
 * @swagger
 * /api/receipts/{id}/html:
 *   get:
 *     summary: Get receipt as HTML
 *     tags: [Receipts]
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
 *         description: HTML receipt
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get(
  '/:id/html',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  ReceiptController.getReceiptHTML
);

/**
 * @swagger
 * /api/receipts/{id}/send/email:
 *   post:
 *     summary: Send receipt via email
 *     tags: [Receipts]
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
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email sent successfully
 */
router.post(
  '/:id/send/email',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  body('email').isEmail().withMessage('Valid email address is required'),
  ReceiptController.sendEmail
);

/**
 * @swagger
 * /api/receipts/{id}/send/sms:
 *   post:
 *     summary: Send receipt via SMS
 *     tags: [Receipts]
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
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: SMS sent successfully
 */
router.post(
  '/:id/send/sms',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  ReceiptController.sendSMS
);

/**
 * @swagger
 * /api/receipts/{id}/retry:
 *   post:
 *     summary: Retry failed delivery
 *     tags: [Receipts]
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
 *         description: Delivery retry initiated
 */
router.post(
  '/:id/retry',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  ReceiptController.retryDelivery
);

/**
 * @swagger
 * /api/receipts/{id}/delivery-status:
 *   get:
 *     summary: Get delivery status
 *     tags: [Receipts]
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
 *         description: Delivery status retrieved
 */
router.get(
  '/:id/delivery-status',
  protect,
  param('id').isInt().withMessage('Receipt ID must be an integer'),
  ReceiptController.getDeliveryStatus
);

module.exports = router;
