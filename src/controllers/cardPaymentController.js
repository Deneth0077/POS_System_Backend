const cardPaymentService = require('../services/cardPaymentService');

// @desc    Initialize card payment session
// @route   POST /api/payments/card/initialize
// @access  Private (Cashier, Manager, Admin)
exports.initializeCardPayment = async (req, res, next) => {
  try {
    const initData = {
      ...req.body,
      cashierId: req.user.id,
      cashierName: req.user.fullName
    };

    const result = await cardPaymentService.initializeCardPayment(initData);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process card payment
// @route   POST /api/payments/card/process
// @access  Private (Cashier, Manager, Admin)
exports.processCardPayment = async (req, res, next) => {
  try {
    const result = await cardPaymentService.processCardPayment(req.body);

    res.status(200).json({
      success: true,
      message: 'Card payment processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get card payment status
// @route   GET /api/payments/card/status/:sessionId
// @access  Private (Cashier, Manager, Admin)
exports.getCardPaymentStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await cardPaymentService.getCardPaymentStatus(sessionId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify card payment webhook
// @route   POST /api/payments/card/verify
// @access  Public (Webhook)
exports.verifyCardPaymentWebhook = async (req, res, next) => {
  try {
    const result = await cardPaymentService.verifyWebhook(req.body);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Process card refund
// @route   POST /api/payments/card/refund
// @access  Private (Manager, Admin)
exports.processCardRefund = async (req, res, next) => {
  try {
    const refundData = {
      ...req.body,
      approvedBy: req.user.id,
      approverName: req.user.fullName
    };

    const result = await cardPaymentService.processCardRefund(refundData);

    res.status(200).json({
      success: true,
      message: 'Card refund initiated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get card transactions
// @route   GET /api/payments/card/transactions
// @access  Private (Manager, Admin)
exports.getCardTransactions = async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status,
      cardBrand: req.query.cardBrand
    };

    const result = await cardPaymentService.getCardTransactions(filters);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel pending card payment
// @route   POST /api/payments/card/cancel
// @access  Private (Cashier, Manager, Admin)
exports.cancelCardPayment = async (req, res, next) => {
  try {
    const result = await cardPaymentService.cancelCardPayment(req.body);

    res.status(200).json({
      success: true,
      message: 'Card payment cancelled successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
