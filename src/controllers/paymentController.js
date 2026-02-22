const paymentService = require('../services/paymentService');

// Lazy-load Stripe to ensure env vars are loaded first
let stripe = null;
const getStripe = () => {
  if (!stripe) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

// @desc    Process cash payment
// @route   POST /api/payments/cash/process
// @access  Private (Cashier, Manager, Admin)
exports.processCashPayment = async (req, res, next) => {
  try {
    const paymentData = {
      ...req.body,
      cashierId: req.user.id,
      cashierName: req.user.fullName
    };

    const result = await paymentService.processCashPayment(paymentData);

    res.status(201).json({
      success: true,
      message: 'Cash payment processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate cash denominations
// @route   POST /api/payments/cash/validate
// @access  Private (Cashier, Manager, Admin)
exports.validateCashDenominations = async (req, res, next) => {
  try {
    const { denominations, expectedTotal } = req.body;

    const validation = paymentService.validateDenominations(denominations, expectedTotal);

    res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cash drawer status
// @route   GET /api/payments/cash/drawer
// @access  Private (Cashier, Manager, Admin)
exports.getCashDrawerStatus = async (req, res, next) => {
  try {
    const { cashierId, shiftId } = req.query;

    // If no cashierId provided, use current user
    const targetCashierId = cashierId || req.user.id;

    // Only allow managers/admins to view other cashiers' drawers
    if (cashierId && cashierId != req.user.id) {
      if (!['Admin', 'Manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view other cashiers\' drawers'
        });
      }
    }

    const drawerStatus = await paymentService.getCashDrawerStatus(targetCashierId, shiftId);

    if (!drawerStatus) {
      return res.status(404).json({
        success: false,
        message: 'No cash drawer found'
      });
    }

    res.status(200).json({
      success: true,
      data: drawerStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Open cash drawer
// @route   POST /api/payments/cash/drawer/open
// @access  Private (Cashier, Manager, Admin)
exports.openCashDrawer = async (req, res, next) => {
  try {
    const drawerData = {
      ...req.body,
      cashierId: req.user.id,
      cashierName: req.user.fullName
    };

    const result = await paymentService.openCashDrawer(drawerData);

    res.status(201).json({
      success: true,
      message: 'Cash drawer opened successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close cash drawer
// @route   POST /api/payments/cash/drawer/close
// @access  Private (Cashier, Manager, Admin)
exports.closeCashDrawer = async (req, res, next) => {
  try {
    const result = await paymentService.closeCashDrawer(req.body);

    res.status(200).json({
      success: true,
      message: 'Cash drawer closed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process cash refund
// @route   POST /api/payments/cash/refund
// @access  Private (Manager, Admin)
exports.processCashRefund = async (req, res, next) => {
  try {
    const refundData = {
      ...req.body,
      approvedBy: req.user.id,
      approverName: req.user.fullName
    };

    const result = await paymentService.processCashRefund(refundData);

    res.status(200).json({
      success: true,
      message: 'Cash refund processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reconcile cash drawer
// @route   POST /api/payments/cash/drawer/reconcile
// @access  Private (Manager, Admin)
exports.reconcileCashDrawer = async (req, res, next) => {
  try {
    const reconciliationData = {
      ...req.body,
      reconciledBy: req.user.id,
      reconcilerName: req.user.fullName
    };

    const result = await paymentService.reconcileCashDrawer(reconciliationData);

    res.status(200).json({
      success: true,
      message: 'Cash drawer reconciled successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reconciliation report
// @route   GET /api/payments/reconciliation/report
// @access  Private (Manager, Admin)
exports.getReconciliationReport = async (req, res, next) => {
  try {
    const { startDate, endDate, cashierId, status } = req.query;

    const report = await paymentService.getReconciliationReport({
      startDate,
      endDate,
      cashierId,
      status
    });

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get drawer discrepancies
// @route   GET /api/payments/reconciliation/discrepancies
// @access  Private (Manager, Admin)
exports.getDrawerDiscrepancies = async (req, res, next) => {
  try {
    const { startDate, endDate, threshold } = req.query;

    const discrepancies = await paymentService.getDrawerDiscrepancies({
      startDate,
      endDate,
      threshold: threshold ? parseFloat(threshold) : 10.00
    });

    res.status(200).json({
      success: true,
      data: discrepancies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment transaction history
// @route   GET /api/payments/transactions
// @access  Private (Manager, Admin)
exports.getPaymentTransactions = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      paymentMethod, 
      cashierId,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const transactions = await paymentService.getPaymentTransactions({
      startDate,
      endDate,
      paymentMethod,
      cashierId,
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get drawer summary
// @route   GET /api/payments/cash/drawer/summary
// @access  Private (Manager, Admin)
exports.getDrawerSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await paymentService.getDrawerSummary({
      startDate,
      endDate
    });

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Stripe Payment Intent
// @route   POST /api/payments/stripe/create-payment-intent
// @access  Private (Cashier, Manager, Admin)
exports.createStripePaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency = 'usd', orderId, metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount'
      });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderId || '',
        cashierId: req.user.id,
        cashierName: req.user.fullName,
        ...metadata
      }
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm Stripe Payment
// @route   POST /api/payments/stripe/confirm
// @access  Private (Cashier, Manager, Admin)
exports.confirmStripePayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID is required'
      });
    }

    // Retrieve the payment intent to verify its status
    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Payment status: ${paymentIntent.status}`,
        data: {
          status: paymentIntent.status
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get Stripe Publishable Key
// @route   GET /api/payments/stripe/config
// @access  Private (Cashier, Manager, Admin)
exports.getStripeConfig = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      }
    });
  } catch (error) {
    next(error);
  }
};
