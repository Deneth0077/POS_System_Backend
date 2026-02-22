/**
 * Mobile Payment Controller
 * Handles HTTP requests for QR code and mobile wallet payments
 */

const MobilePaymentService = require('../services/mobilePaymentService');
const { validationResult } = require('express-validator');

/**
 * Generate QR code for mobile wallet payment
 * POST /api/payments/mobile/qr/generate
 */
exports.generateQRPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const result = await MobilePaymentService.generateQRPayment({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process mobile wallet payment
 * POST /api/payments/mobile/process
 */
exports.processMobilePayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const result = await MobilePaymentService.processMobilePayment({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      message: 'Mobile payment processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get mobile payment status
 * GET /api/payments/mobile/status/:qrId
 */
exports.getMobilePaymentStatus = async (req, res, next) => {
  try {
    const { qrId } = req.params;
    
    const result = await MobilePaymentService.getMobilePaymentStatus(qrId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify mobile wallet payment webhook
 * POST /api/payments/mobile/verify
 */
exports.verifyMobilePaymentWebhook = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const result = await MobilePaymentService.verifyMobilePaymentWebhook(req.body);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Process mobile wallet refund
 * POST /api/payments/mobile/refund
 */
exports.processMobileRefund = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const result = await MobilePaymentService.processMobileRefund({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      message: 'Mobile wallet refund initiated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get supported mobile wallets
 * GET /api/payments/mobile/wallets
 */
exports.getSupportedWallets = async (req, res, next) => {
  try {
    const result = await MobilePaymentService.getSupportedWallets();
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get mobile wallet transactions
 * GET /api/payments/mobile/transactions
 */
exports.getMobileTransactions = async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      walletType: req.query.walletType,
      status: req.query.status
    };
    
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };
    
    const result = await MobilePaymentService.getMobileTransactions(filters, pagination);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel mobile payment session
 * POST /api/payments/mobile/cancel
 */
exports.cancelMobilePayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const result = await MobilePaymentService.cancelMobilePayment(
      req.body.qrId,
      req.body.reason,
      req.user.id
    );
    
    res.status(200).json({
      success: true,
      message: 'Mobile payment cancelled successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
