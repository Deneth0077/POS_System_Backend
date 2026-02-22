const ReceiptService = require('../services/receiptService');
const NotificationService = require('../services/notificationService');
const { Receipt, Sale } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Receipt Controller
 * Handles all receipt generation and management operations
 */
class ReceiptController {
  /**
   * Generate a new receipt for a sale
   * POST /api/receipts
   */
  static async generateReceipt(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const {
        saleId,
        receiptType = 'original',
        format = 'print',
        language = 'english',
        deliveryMethod = null
      } = req.body;

      // Verify sale exists
      const sale = await Sale.findByPk(saleId);
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      // Create receipt
      const { receipt, template } = await ReceiptService.createReceipt(
        saleId,
        req.user.id,
        req.user.fullName || req.user.username,
        {
          receiptType,
          format,
          language,
          deliveryMethod,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: {
            generatedFrom: 'api',
            ...req.body.metadata
          }
        }
      );

      // If digital format, send immediately
      let deliveryResult = null;
      if (format === 'email' && deliveryMethod) {
        deliveryResult = await NotificationService.sendReceiptEmail(receipt.id, deliveryMethod);
      } else if (format === 'sms' && deliveryMethod) {
        deliveryResult = await NotificationService.sendReceiptSMS(receipt.id, deliveryMethod);
      }

      res.status(201).json({
        success: true,
        message: 'Receipt generated successfully',
        data: {
          receipt,
          template: format === 'print' || format === 'pdf' ? template : undefined,
          delivery: deliveryResult
        }
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate receipt',
        error: error.message
      });
    }
  }

  /**
   * Get receipt by ID
   * GET /api/receipts/:id
   */
  static async getReceipt(req, res) {
    try {
      const { id } = req.params;
      const { includeTemplate } = req.query;

      const receipt = await ReceiptService.getReceiptById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        });
      }

      const response = {
        success: true,
        data: {
          receipt
        }
      };

      // Include formatted template if requested
      if (includeTemplate === 'true') {
        response.data.template = receipt.receiptData.template;
      }

      res.json(response);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch receipt',
        error: error.message
      });
    }
  }

  /**
   * Get all receipts for a sale
   * GET /api/receipts/sale/:saleId
   */
  static async getReceiptsBySale(req, res) {
    try {
      const { saleId } = req.params;

      const receipts = await ReceiptService.getReceiptsBySale(saleId);

      res.json({
        success: true,
        count: receipts.length,
        data: {
          receipts
        }
      });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch receipts',
        error: error.message
      });
    }
  }

  /**
   * Generate duplicate receipt
   * POST /api/receipts/:id/duplicate
   */
  static async generateDuplicate(req, res) {
    try {
      const { id } = req.params;

      const { receipt, template } = await ReceiptService.generateDuplicate(
        id,
        req.user.id,
        req.user.fullName || req.user.username
      );

      res.status(201).json({
        success: true,
        message: 'Duplicate receipt generated successfully',
        data: {
          receipt,
          template
        }
      });
    } catch (error) {
      console.error('Error generating duplicate receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate duplicate receipt',
        error: error.message
      });
    }
  }

  /**
   * Void a receipt
   * POST /api/receipts/:id/void
   */
  static async voidReceipt(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Void reason is required'
        });
      }

      const receipt = await ReceiptService.voidReceipt(id, req.user.id, reason);

      res.json({
        success: true,
        message: 'Receipt voided successfully',
        data: {
          receipt
        }
      });
    } catch (error) {
      console.error('Error voiding receipt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to void receipt',
        error: error.message
      });
    }
  }

  /**
   * Get receipt as plain text
   * GET /api/receipts/:id/text
   */
  static async getReceiptText(req, res) {
    try {
      const { id } = req.params;

      const receipt = await ReceiptService.getReceiptById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        });
      }

      const template = receipt.receiptData.template;
      const plainText = ReceiptService.templateToPlainText(template);

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(plainText);
    } catch (error) {
      console.error('Error generating receipt text:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate receipt text',
        error: error.message
      });
    }
  }

  /**
   * Get receipt as HTML
   * GET /api/receipts/:id/html
   */
  static async getReceiptHTML(req, res) {
    try {
      const { id } = req.params;

      const receipt = await ReceiptService.getReceiptById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        });
      }

      const template = receipt.receiptData.template;
      const html = ReceiptService.templateToHTML(template);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Error generating receipt HTML:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate receipt HTML',
        error: error.message
      });
    }
  }

  /**
   * Send receipt via email
   * POST /api/receipts/:id/send/email
   */
  static async sendEmail(req, res) {
    try {
      const { id } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      const result = await NotificationService.sendReceiptEmail(id, email);

      res.json({
        success: result.success,
        message: result.success ? 'Email sent successfully' : 'Failed to send email',
        data: result
      });
    } catch (error) {
      console.error('Error sending receipt email:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send receipt email',
        error: error.message
      });
    }
  }

  /**
   * Send receipt via SMS
   * POST /api/receipts/:id/send/sms
   */
  static async sendSMS(req, res) {
    try {
      const { id } = req.params;
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const result = await NotificationService.sendReceiptSMS(id, phoneNumber);

      res.json({
        success: result.success,
        message: result.success ? 'SMS sent successfully' : 'Failed to send SMS',
        data: result
      });
    } catch (error) {
      console.error('Error sending receipt SMS:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send receipt SMS',
        error: error.message
      });
    }
  }

  /**
   * Retry failed delivery
   * POST /api/receipts/:id/retry
   */
  static async retryDelivery(req, res) {
    try {
      const { id } = req.params;

      const result = await NotificationService.retryDelivery(id);

      res.json({
        success: result.success,
        message: result.success ? 'Delivery retry successful' : 'Delivery retry failed',
        data: result
      });
    } catch (error) {
      console.error('Error retrying delivery:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry delivery',
        error: error.message
      });
    }
  }

  /**
   * Get delivery status
   * GET /api/receipts/:id/delivery-status
   */
  static async getDeliveryStatus(req, res) {
    try {
      const { id } = req.params;

      const status = await NotificationService.getDeliveryStatus(id);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting delivery status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get delivery status',
        error: error.message
      });
    }
  }

  /**
   * Get receipt audit log
   * GET /api/receipts/audit
   */
  static async getAuditLog(req, res) {
    try {
      const { 
        startDate, 
        endDate, 
        receiptType, 
        format, 
        language,
        deliveryStatus,
        page = 1, 
        limit = 50 
      } = req.query;

      const where = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      if (receiptType) where.receiptType = receiptType;
      if (format) where.format = format;
      if (language) where.language = language;
      if (deliveryStatus) where.deliveryStatus = deliveryStatus;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await Receipt.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          { 
            model: require('../models').User, 
            as: 'generator', 
            attributes: ['id', 'username', 'fullName'] 
          },
          { 
            model: require('../models').Sale, 
            as: 'sale',
            attributes: ['id', 'saleNumber', 'totalAmount', 'orderType']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          receipts: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit log',
        error: error.message
      });
    }
  }

  /**
   * Get receipt statistics
   * GET /api/receipts/stats
   */
  static async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const where = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      const [
        totalReceipts,
        receiptsByType,
        receiptsByFormat,
        receiptsByLanguage,
        receiptsByDeliveryStatus
      ] = await Promise.all([
        Receipt.count({ where }),
        Receipt.findAll({
          where,
          attributes: [
            'receiptType',
            [require('../config/database').sequelize.fn('COUNT', 'id'), 'count']
          ],
          group: ['receiptType']
        }),
        Receipt.findAll({
          where,
          attributes: [
            'format',
            [require('../config/database').sequelize.fn('COUNT', 'id'), 'count']
          ],
          group: ['format']
        }),
        Receipt.findAll({
          where,
          attributes: [
            'language',
            [require('../config/database').sequelize.fn('COUNT', 'id'), 'count']
          ],
          group: ['language']
        }),
        Receipt.findAll({
          where,
          attributes: [
            'deliveryStatus',
            [require('../config/database').sequelize.fn('COUNT', 'id'), 'count']
          ],
          group: ['deliveryStatus']
        })
      ]);

      res.json({
        success: true,
        data: {
          totalReceipts,
          byType: receiptsByType,
          byFormat: receiptsByFormat,
          byLanguage: receiptsByLanguage,
          byDeliveryStatus: receiptsByDeliveryStatus
        }
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error.message
      });
    }
  }
}

module.exports = ReceiptController;
