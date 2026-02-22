const CardSession = require('../models/CardSession');
const PaymentTransaction = require('../models/PaymentTransaction');
const Sale = require('../models/Sale');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class CardPaymentService {
  /**
   * Generate unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    return `cs_${timestamp}_${random}`;
  }

  /**
   * Generate payment intent ID (simulated for demo)
   */
  generatePaymentIntentId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    return `pi_${timestamp}_${random}`;
  }

  /**
   * Generate transaction ID
   */
  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `CARD-${timestamp}-${random}`;
  }

  /**
   * Call payment gateway API
   */
  async callPaymentGateway(action, data) {
    try {
      switch (action) {
        case 'initialize': {
          const { amount, currency, metadata } = data;

          // Stripe expects amount in smallest currency unit (cents for LKR)
          const stripeAmount = Math.round(amount * 100);

          const paymentIntent = await stripe.paymentIntents.create({
            amount: stripeAmount,
            currency: currency.toLowerCase(),
            metadata: metadata || {},
            automatic_payment_methods: {
              enabled: true,
            },
          });

          return {
            success: true,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            status: 'pending'
          };
        }

        case 'process': {
          const { paymentIntentId } = data;

          // In Stripe's Payment Intent flow, the payment is often confirmed on the client side.
          // If the backend needs to check status:
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

          const isSuccessful = paymentIntent.status === 'succeeded';

          // Attempt to get card details from the latest charge
          let cardDetails = null;
          if (paymentIntent.latest_charge) {
            const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
            if (charge.payment_method_details && charge.payment_method_details.card) {
              cardDetails = charge.payment_method_details.card;
            }
          }

          return {
            success: isSuccessful,
            status: isSuccessful ? 'completed' : 'failed',
            authorizationCode: isSuccessful ? (paymentIntent.id) : null,
            failureReason: !isSuccessful ? paymentIntent.last_payment_error?.message : null,
            transactionRef: paymentIntent.id,
            cardBrand: cardDetails?.brand,
            cardLast4: cardDetails?.last4
          };
        }

        case 'refund': {
          const { transactionId, amount, reason } = data;

          const refund = await stripe.refunds.create({
            payment_intent: transactionId,
            amount: amount ? Math.round(amount * 100) : undefined,
            reason: reason === 'requested_by_customer' ? 'requested_by_customer' : 'duplicate'
          });

          return {
            success: true,
            status: 'completed',
            refundRef: refund.id
          };
        }

        case 'cancel': {
          const { paymentIntentId } = data;

          const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

          return {
            success: true,
            status: 'cancelled'
          };
        }

        default:
          throw new Error('Unknown gateway action');
      }
    } catch (error) {
      console.error(`Stripe gateway error (${action}):`, error);
      return {
        success: false,
        status: 'failed',
        failureReason: error.message
      };
    }
  }

  /**
   * Initialize card payment session
   */
  async initializeCardPayment(initData) {
    const transaction = await sequelize.transaction();

    try {
      const { saleId, amount, currency = 'LKR', cardType, returnUrl, metadata, cashierId, cashierName } = initData;

      // Validate sale if provided
      if (saleId) {
        const sale = await Sale.findByPk(saleId, { transaction });
        if (!sale) {
          throw new Error('Sale not found');
        }
      }

      // Call payment gateway to initialize
      const gatewayResponse = await this.callPaymentGateway('initialize', {
        amount,
        currency,
        metadata
      });

      // Calculate expiration (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Create card session
      const sessionId = this.generateSessionId();
      const cardSession = await CardSession.create({
        sessionId,
        paymentIntentId: gatewayResponse.paymentIntentId,
        saleId,
        amount,
        currency,
        status: 'pending',
        cardType,
        cashierId,
        cashierName,
        clientSecret: gatewayResponse.clientSecret,
        returnUrl,
        metadata,
        gatewayResponse,
        expiresAt
      }, { transaction });

      await transaction.commit();

      return {
        sessionId: cardSession.sessionId,
        paymentIntentId: cardSession.paymentIntentId,
        amount: parseFloat(cardSession.amount),
        currency: cardSession.currency,
        status: cardSession.status,
        expiresAt: cardSession.expiresAt,
        clientSecret: cardSession.clientSecret
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Process card payment
   */
  async processCardPayment(paymentData) {
    const transaction = await sequelize.transaction();

    try {
      const { sessionId, cardDetails, billingDetails, saveCard = false } = paymentData;

      // Get card session
      const cardSession = await CardSession.findOne({
        where: { sessionId },
        transaction
      });

      if (!cardSession) {
        throw new Error('Invalid session ID');
      }

      if (cardSession.status !== 'pending') {
        throw new Error(`Session is ${cardSession.status}, cannot process payment`);
      }

      // Check if session expired
      if (new Date() > new Date(cardSession.expiresAt)) {
        await cardSession.update({ status: 'expired' }, { transaction });
        throw new Error('Payment session has expired');
      }

      // Update session to processing
      await cardSession.update({ status: 'processing' }, { transaction });

      // Call payment gateway to process
      const gatewayResponse = await this.callPaymentGateway('process', {
        paymentIntentId: cardSession.paymentIntentId,
        amount: cardSession.amount,
        cardDetails,
        billingDetails
      });

      // Update card session with card details
      await cardSession.update({
        cardBrand: cardDetails.brand || 'Unknown',
        cardLast4: cardDetails.last4,
        cardExpiryMonth: cardDetails.expiryMonth,
        cardExpiryYear: cardDetails.expiryYear,
        status: gatewayResponse.status,
        gatewayResponse: { ...cardSession.gatewayResponse, processResponse: gatewayResponse },
        failureReason: gatewayResponse.failureReason,
        completedAt: gatewayResponse.success ? new Date() : null
      }, { transaction });

      if (!gatewayResponse.success) {
        await transaction.commit();
        throw new Error(gatewayResponse.failureReason || 'Payment failed');
      }

      // Create payment transaction record
      const transactionId = this.generateTransactionId();
      const paymentTransaction = await PaymentTransaction.create({
        transactionId,
        saleId: cardSession.saleId,
        paymentMethod: 'card',
        amount: cardSession.amount,
        currency: cardSession.currency,
        status: 'completed',
        transactionType: 'payment',
        cashierId: cardSession.cashierId,
        cashierName: cardSession.cashierName,
        cardBrand: cardDetails.brand,
        cardLast4: cardDetails.last4,
        authorizationCode: gatewayResponse.authorizationCode,
        gatewayResponse,
        gatewayTransactionId: gatewayResponse.transactionRef,
        receiptNumber: cardSession.saleId ? `CARD-${cardSession.saleId}` : transactionId,
        processedAt: new Date()
      }, { transaction });

      // Update sale if exists
      if (cardSession.saleId) {
        const sale = await Sale.findByPk(cardSession.saleId, { transaction });
        if (sale && sale.paymentMethod !== 'card') {
          await sale.update({ paymentMethod: 'card' }, { transaction });
        }
      }

      await transaction.commit();

      return {
        transactionId: paymentTransaction.transactionId,
        paymentId: paymentTransaction.id,
        saleNumber: paymentTransaction.receiptNumber,
        amount: parseFloat(paymentTransaction.amount),
        cardLast4: paymentTransaction.cardLast4,
        cardBrand: paymentTransaction.cardBrand,
        status: 'completed',
        authorizationCode: paymentTransaction.authorizationCode,
        timestamp: paymentTransaction.processedAt,
        receiptNumber: paymentTransaction.receiptNumber
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get card payment status
   */
  async getCardPaymentStatus(sessionId) {
    const cardSession = await CardSession.findOne({
      where: { sessionId }
    });

    if (!cardSession) {
      throw new Error('Session not found');
    }

    // Get associated transaction if completed
    let transactionId = null;
    if (cardSession.status === 'completed') {
      const transaction = await PaymentTransaction.findOne({
        where: {
          saleId: cardSession.saleId,
          paymentMethod: 'card',
          status: 'completed'
        }
      });
      transactionId = transaction ? transaction.transactionId : null;
    }

    return {
      sessionId: cardSession.sessionId,
      status: cardSession.status,
      amount: parseFloat(cardSession.amount),
      currency: cardSession.currency,
      transactionId,
      failureReason: cardSession.failureReason,
      timestamp: cardSession.completedAt || cardSession.updatedAt,
      expiresAt: cardSession.expiresAt
    };
  }

  /**
   * Verify payment webhook (from payment gateway)
   */
  async verifyWebhook(webhookData) {
    const { eventType, paymentIntentId, status, amount, metadata, signature } = webhookData;

    // In production, verify webhook signature
    // For demo, we'll accept it
    const isValidSignature = true; // Replace with actual signature verification

    if (!isValidSignature) {
      throw new Error('Invalid webhook signature');
    }

    // Find card session by payment intent ID
    const cardSession = await CardSession.findOne({
      where: { paymentIntentId }
    });

    if (!cardSession) {
      throw new Error('Payment session not found');
    }

    // Update session status based on webhook event
    await cardSession.update({
      status,
      gatewayResponse: { ...cardSession.gatewayResponse, webhook: webhookData },
      completedAt: status === 'completed' ? new Date() : cardSession.completedAt
    });

    return {
      success: true,
      message: 'Webhook processed successfully'
    };
  }

  /**
   * Process card refund
   */
  async processCardRefund(refundData) {
    const transaction = await sequelize.transaction();

    try {
      const { transactionId, amount, reason, approvedBy, approverName, notes } = refundData;

      // Get original payment transaction
      const originalPayment = await PaymentTransaction.findOne({
        where: {
          transactionId,
          paymentMethod: 'card',
          transactionType: 'payment'
        },
        transaction
      });

      if (!originalPayment) {
        throw new Error('Original card payment not found');
      }

      if (originalPayment.status === 'refunded') {
        throw new Error('Payment has already been refunded');
      }

      // Validate refund amount
      if (amount > parseFloat(originalPayment.amount)) {
        throw new Error('Refund amount exceeds original payment amount');
      }

      // Call payment gateway to process refund
      const gatewayResponse = await this.callPaymentGateway('refund', {
        transactionId: originalPayment.gatewayTransactionId,
        amount,
        reason
      });

      if (!gatewayResponse.success) {
        throw new Error('Gateway refund failed');
      }

      // Create refund transaction
      const refundTransactionId = this.generateTransactionId().replace('CARD', 'REFUND');
      const refundTransaction = await PaymentTransaction.create({
        transactionId: refundTransactionId,
        saleId: originalPayment.saleId,
        saleNumber: originalPayment.saleNumber,
        paymentMethod: 'card',
        amount,
        currency: originalPayment.currency,
        status: gatewayResponse.status === 'completed' ? 'completed' : 'pending',
        transactionType: 'refund',
        cashierId: approvedBy,
        cashierName: approverName,
        cardBrand: originalPayment.cardBrand,
        cardLast4: originalPayment.cardLast4,
        refundReason: reason,
        refundedAmount: amount,
        approvedBy,
        gatewayResponse,
        gatewayTransactionId: gatewayResponse.refundRef,
        receiptNumber: `REF-${originalPayment.receiptNumber}`,
        notes,
        processedAt: new Date(),
        refundedAt: new Date()
      }, { transaction });

      // Update original payment status
      await originalPayment.update({
        status: 'refunded',
        refundedAmount: amount
      }, { transaction });

      // Update sale if exists
      if (originalPayment.saleId) {
        const sale = await Sale.findByPk(originalPayment.saleId, { transaction });
        if (sale) {
          await sale.update({ status: 'refunded' }, { transaction });
        }
      }

      await transaction.commit();

      return {
        refundId: refundTransaction.id,
        transactionId: refundTransaction.transactionId,
        refundAmount: parseFloat(amount),
        status: refundTransaction.status,
        estimatedArrival: '5-10 business days',
        refundedAt: refundTransaction.refundedAt
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get card transactions
   */
  async getCardTransactions(filters = {}) {
    const { page = 1, limit = 20, startDate, endDate, status, cardBrand } = filters;
    const offset = (page - 1) * limit;

    const where = {
      paymentMethod: 'card'
    };

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (status) {
      where.status = status;
    }

    if (cardBrand) {
      where.cardBrand = cardBrand;
    }

    const { count, rows } = await PaymentTransaction.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      attributes: [
        'transactionId',
        'saleNumber',
        'amount',
        'cardBrand',
        'cardLast4',
        'status',
        'authorizationCode',
        'createdAt'
      ]
    });

    return {
      transactions: rows.map(t => ({
        transactionId: t.transactionId,
        saleNumber: t.saleNumber,
        amount: parseFloat(t.amount),
        cardBrand: t.cardBrand,
        cardLast4: t.cardLast4,
        status: t.status,
        authorizationCode: t.authorizationCode,
        createdAt: t.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Cancel pending card payment
   */
  async cancelCardPayment(cancelData) {
    const transaction = await sequelize.transaction();

    try {
      const { sessionId, reason } = cancelData;

      const cardSession = await CardSession.findOne({
        where: { sessionId },
        transaction
      });

      if (!cardSession) {
        throw new Error('Session not found');
      }

      if (!['pending', 'processing'].includes(cardSession.status)) {
        throw new Error(`Cannot cancel payment with status: ${cardSession.status}`);
      }

      // Call gateway to cancel if needed
      if (cardSession.paymentIntentId) {
        await this.callPaymentGateway('cancel', {
          paymentIntentId: cardSession.paymentIntentId
        });
      }

      // Update session
      await cardSession.update({
        status: 'cancelled',
        failureReason: reason || 'Cancelled by user',
        cancelledAt: new Date()
      }, { transaction });

      await transaction.commit();

      return {
        sessionId: cardSession.sessionId,
        status: 'cancelled',
        cancelledAt: cardSession.cancelledAt
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new CardPaymentService();
