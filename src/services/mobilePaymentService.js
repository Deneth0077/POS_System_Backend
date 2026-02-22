/**
 * Mobile Payment Service
 * Business logic for QR code and mobile wallet payments
 * Supports: Genie, Frimi, PayHere, and other Sri Lankan mobile wallets
 */

const MobilePaymentSession = require('../models/MobilePaymentSession');
const PaymentTransaction = require('../models/PaymentTransaction');
const Sale = require('../models/Sale');
const User = require('../models/User');
const QRCode = require('qrcode');

// Supported mobile wallet providers in Sri Lanka
const SUPPORTED_WALLETS = {
  genie: {
    name: 'Genie by Cargills Bank',
    logo: '/assets/wallets/genie.png',
    isActive: true,
    supportedCurrencies: ['LKR'],
    minAmount: 10.00,
    maxAmount: 100000.00,
    processingFee: 0,
    processingFeeType: 'fixed'
  },
  frimi: {
    name: 'frimi by LOLC',
    logo: '/assets/wallets/frimi.png',
    isActive: true,
    supportedCurrencies: ['LKR'],
    minAmount: 10.00,
    maxAmount: 100000.00,
    processingFee: 0,
    processingFeeType: 'fixed'
  },
  payhere: {
    name: 'PayHere',
    logo: '/assets/wallets/payhere.png',
    isActive: true,
    supportedCurrencies: ['LKR', 'USD'],
    minAmount: 50.00,
    maxAmount: 500000.00,
    processingFee: 3.5,
    processingFeeType: 'percentage'
  },
  ezcash: {
    name: 'eZCash',
    logo: '/assets/wallets/ezcash.png',
    isActive: true,
    supportedCurrencies: ['LKR'],
    minAmount: 10.00,
    maxAmount: 50000.00,
    processingFee: 0,
    processingFeeType: 'fixed'
  },
  mcash: {
    name: 'mCash by Dialog',
    logo: '/assets/wallets/mcash.png',
    isActive: true,
    supportedCurrencies: ['LKR'],
    minAmount: 10.00,
    maxAmount: 50000.00,
    processingFee: 0,
    processingFeeType: 'fixed'
  }
};

class MobilePaymentService {

  /**
   * Generate unique QR ID
   */
  static generateQRId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    return `qr_${timestamp}_${random}`;
  }

  /**
   * Simulate mobile wallet gateway API call
   * In production, replace with actual gateway API client
   */
  static async callMobileWalletGateway(endpoint, data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate 95% success rate
    const success = Math.random() < 0.95;

    if (endpoint === '/qr/generate') {
      return {
        success: true,
        qrPaymentId: `qrpay_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        qrContent: `upi://pay?pa=${data.walletType}@merchant&pn=POS_SYSTEM&am=${data.amount}&cu=${data.currency}`,
        message: 'QR generated successfully'
      };
    }

    if (endpoint === '/payment/process') {
      if (success) {
        return {
          success: true,
          transactionId: `mob_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          paymentRef: `REF${Math.floor(Math.random() * 1000000000)}`,
          status: 'completed',
          message: 'Payment successful'
        };
      } else {
        return {
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient wallet balance'
        };
      }
    }

    if (endpoint === '/refund') {
      return {
        success: true,
        refundId: `refund_${Date.now()}`,
        status: 'completed',
        message: 'Refund processed successfully'
      };
    }

    if (endpoint === '/cancel') {
      return {
        success: true,
        message: 'Payment cancelled successfully'
      };
    }

    return { success: false, message: 'Unknown endpoint' };
  }

  /**
   * Generate QR code for mobile wallet payment
   */
  static async generateQRPayment(data) {
    const { saleId, amount, currency = 'LKR', walletType, expiryMinutes = 10, userId, metadata = {} } = data;

    // Validate wallet type
    if (!SUPPORTED_WALLETS[walletType]) {
      throw new Error(`Unsupported wallet type: ${walletType}`);
    }

    // Validate amount limits
    const wallet = SUPPORTED_WALLETS[walletType];
    if (amount < wallet.minAmount || amount > wallet.maxAmount) {
      throw new Error(`Amount must be between ${wallet.minAmount} and ${wallet.maxAmount} for ${wallet.name}`);
    }

    // Get user info
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // If saleId provided, validate sale exists
    if (saleId) {
      const sale = await Sale.findByPk(saleId);
      if (!sale) {
        throw new Error('Sale not found');
      }
    }

    // Generate QR ID
    const qrId = this.generateQRId();

    // Call gateway to generate QR payment
    const gatewayResponse = await this.callMobileWalletGateway('/qr/generate', {
      qrId,
      amount,
      currency,
      walletType
    });

    // Generate QR code image
    const qrContent = gatewayResponse.qrContent;
    const qrCodeImage = await QRCode.toDataURL(qrContent);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Create session
    const session = await MobilePaymentSession.create({
      qrId,
      saleId: saleId || null,
      cashierId: userId,
      cashierName: user.fullName || user.username,
      amount,
      currency,
      walletType,
      qrCode: qrCodeImage,
      qrData: qrContent,
      status: 'pending',
      gatewayPaymentId: gatewayResponse.qrPaymentId,
      gatewayResponse,
      metadata,
      expiresAt
    });

    return {
      qrId: session.qrId,
      qrCode: session.qrCode,
      qrData: session.qrData,
      amount: session.amount,
      currency: session.currency,
      walletType: session.walletType,
      expiresAt: session.expiresAt,
      status: session.status
    };
  }

  /**
   * Process mobile wallet payment
   */
  static async processMobilePayment(data) {
    const { qrId, saleId, amount, walletType, phoneNumber, transactionRef, userId, metadata = {} } = data;

    let session = null;

    // If QR-based payment, find existing session
    if (qrId) {
      session = await MobilePaymentSession.findOne({ where: { qrId } });
      if (!session) {
        throw new Error('QR payment session not found');
      }

      // Check if expired
      if (session.expiresAt && new Date() > session.expiresAt) {
        await session.update({ status: 'expired' });
        throw new Error('QR code has expired');
      }

      // Check if already processed
      if (session.status === 'completed') {
        throw new Error('Payment already processed');
      }

    } else {
      // Direct mobile wallet payment (non-QR)
      // Get user info
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create new session
      const newQrId = this.generateQRId();
      session = await MobilePaymentSession.create({
        qrId: newQrId,
        saleId: saleId || null,
        cashierId: userId,
        cashierName: user.fullName || user.username,
        amount,
        currency: 'LKR',
        walletType,
        phoneNumber: phoneNumber ? this.maskPhoneNumber(phoneNumber) : null,
        status: 'processing',
        transactionRef,
        metadata
      });
    }

    // Update status to processing
    await session.update({ status: 'processing' });

    // Call gateway to process payment
    const gatewayResponse = await this.callMobileWalletGateway('/payment/process', {
      qrId: session.qrId,
      amount: session.amount,
      walletType: session.walletType,
      phoneNumber: phoneNumber,
      transactionRef
    });

    if (!gatewayResponse.success) {
      // Payment failed
      await session.update({
        status: 'failed',
        failureReason: gatewayResponse.message,
        gatewayResponse
      });
      throw new Error(gatewayResponse.message || 'Mobile payment failed');
    }

    // Payment successful - create transaction record
    const transactionId = `MOB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const transaction = await PaymentTransaction.create({
      transactionId,
      saleId: session.saleId,
      saleNumber: session.saleId ? (await Sale.findByPk(session.saleId))?.saleNumber : null,
      paymentMethod: 'mobile',
      amount: session.amount,
      currency: session.currency,
      status: 'completed',
      transactionType: 'payment',
      cashierId: session.cashierId,
      cashierName: session.cashierName,
      walletType: session.walletType,
      phoneNumber: session.phoneNumber || this.maskPhoneNumber(phoneNumber),
      qrId: session.qrId,
      gatewayResponse: gatewayResponse,
      gatewayTransactionId: gatewayResponse.transactionId,
      processedAt: new Date()
    });

    // Update session
    await session.update({
      status: 'completed',
      transactionRef: gatewayResponse.paymentRef,
      gatewayPaymentId: gatewayResponse.transactionId,
      gatewayResponse,
      paidAt: new Date(),
      completedAt: new Date()
    });

    // Update sale if applicable
    if (session.saleId) {
      await Sale.update(
        { paymentStatus: 'paid', paidAt: new Date() },
        { where: { id: session.saleId } }
      );
    }

    return {
      transactionId: transaction.transactionId,
      paymentId: session.qrId,
      saleNumber: transaction.saleNumber,
      amount: transaction.amount,
      walletType: session.walletType,
      phoneNumber: session.phoneNumber,
      status: 'completed',
      transactionRef: session.transactionRef,
      timestamp: transaction.processedAt,
      receiptNumber: transaction.receiptNumber || transactionId
    };
  }

  /**
   * Get mobile payment status
   */
  static async getMobilePaymentStatus(qrId) {
    const session = await MobilePaymentSession.findOne({
      where: { qrId },
      include: [
        {
          model: Sale,
          as: 'sale',
          attributes: ['id', 'saleNumber', 'totalAmount']
        }
      ]
    });

    if (!session) {
      throw new Error('Mobile payment session not found');
    }

    // Check if expired but not marked
    if (session.expiresAt && new Date() > session.expiresAt && session.status === 'pending') {
      await session.update({ status: 'expired' });
      session.status = 'expired';
    }

    // Find transaction if completed
    let transactionId = null;
    if (session.status === 'completed') {
      const transaction = await PaymentTransaction.findOne({
        where: { qrId },
        attributes: ['transactionId']
      });
      transactionId = transaction?.transactionId;
    }

    return {
      qrId: session.qrId,
      status: session.status,
      amount: session.amount,
      walletType: session.walletType,
      phoneNumber: session.phoneNumber,
      transactionId,
      paidAt: session.paidAt,
      expiresAt: session.expiresAt,
      sale: session.Sale
    };
  }

  /**
   * Verify mobile wallet webhook
   */
  static async verifyMobilePaymentWebhook(eventData) {
    const { eventType, paymentId, status, amount, phoneNumber, walletType, transactionRef, signature } = eventData;

    // In production, verify webhook signature here
    // For now, we'll simulate signature verification
    const isValidSignature = signature && signature.startsWith('whsec_');

    if (!isValidSignature) {
      throw new Error('Invalid webhook signature');
    }

    // Find session by gateway payment ID or QR ID
    const session = await MobilePaymentSession.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { gatewayPaymentId: paymentId },
          { qrId: paymentId }
        ]
      }
    });

    if (!session) {
      // This might be okay - webhook for a session we don't track
      return { success: true, message: 'Session not found, ignoring webhook' };
    }

    // Update session based on webhook
    if (eventType === 'payment.succeeded' && status === 'completed') {
      if (session.status !== 'completed') {
        // Create transaction record if not exists
        const existingTransaction = await PaymentTransaction.findOne({
          where: { qrId: session.qrId }
        });

        if (!existingTransaction) {
          const transactionId = `MOB-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          await PaymentTransaction.create({
            transactionId,
            saleId: session.saleId,
            saleNumber: session.saleId ? (await Sale.findByPk(session.saleId))?.saleNumber : null,
            paymentMethod: 'mobile',
            amount: session.amount,
            currency: session.currency,
            status: 'completed',
            transactionType: 'payment',
            cashierId: session.cashierId,
            cashierName: session.cashierName,
            walletType: session.walletType,
            phoneNumber: session.phoneNumber,
            qrId: session.qrId,
            gatewayTransactionId: transactionRef,
            processedAt: new Date()
          });
        }

        await session.update({
          status: 'completed',
          transactionRef,
          paidAt: new Date(),
          completedAt: new Date()
        });

        // Update sale
        if (session.saleId) {
          await Sale.update(
            { paymentStatus: 'paid', paidAt: new Date() },
            { where: { id: session.saleId } }
          );
        }
      }
    } else if (eventType === 'payment.failed') {
      await session.update({
        status: 'failed',
        failureReason: 'Payment failed via webhook'
      });
    }

    return { success: true, message: 'Webhook processed successfully' };
  }

  /**
   * Process mobile wallet refund
   */
  static async processMobileRefund(data) {
    const { transactionId, amount, walletType, phoneNumber, reason, userId, notes = '' } = data;

    // Find original transaction
    const originalTransaction = await PaymentTransaction.findOne({
      where: { transactionId, paymentMethod: 'mobile' }
    });

    if (!originalTransaction) {
      throw new Error('Original mobile payment transaction not found');
    }

    // Validate refund amount
    if (amount > originalTransaction.amount) {
      throw new Error('Refund amount cannot exceed original payment amount');
    }

    // Check if already refunded
    if (originalTransaction.status === 'refunded') {
      throw new Error('Transaction already refunded');
    }

    // Get user info
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Call gateway to process refund
    const gatewayResponse = await this.callMobileWalletGateway('/refund', {
      transactionId: originalTransaction.gatewayTransactionId,
      amount,
      walletType,
      phoneNumber
    });

    if (!gatewayResponse.success) {
      throw new Error('Mobile wallet refund failed at gateway');
    }

    // Create refund transaction
    const refundId = `MOBREF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const refundTransaction = await PaymentTransaction.create({
      transactionId: refundId,
      saleId: originalTransaction.saleId,
      saleNumber: originalTransaction.saleNumber,
      paymentMethod: 'mobile',
      amount: -amount, // Negative for refund
      currency: originalTransaction.currency,
      status: 'completed',
      transactionType: 'refund',
      cashierId: userId,
      cashierName: user.fullName || user.username,
      walletType,
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      qrId: originalTransaction.qrId,
      refundReason: reason,
      refundedAmount: amount,
      approvedBy: userId,
      notes,
      gatewayResponse: gatewayResponse,
      gatewayTransactionId: gatewayResponse.refundId,
      processedAt: new Date(),
      refundedAt: new Date()
    });

    // Update original transaction
    await originalTransaction.update({
      status: 'refunded',
      refundedAmount: amount,
      refundedAt: new Date()
    });

    return {
      refundId: refundTransaction.transactionId,
      transactionId: originalTransaction.transactionId,
      refundAmount: amount,
      walletType,
      status: 'completed',
      estimatedArrival: 'Instant to 24 hours',
      refundedAt: refundTransaction.refundedAt
    };
  }

  /**
   * Get supported mobile wallets
   */
  static async getSupportedWallets() {
    return {
      wallets: Object.entries(SUPPORTED_WALLETS).map(([type, details]) => ({
        type,
        ...details
      }))
    };
  }

  /**
   * Get mobile wallet transactions
   */
  static async getMobileTransactions(filters = {}, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const { startDate, endDate, walletType, status } = filters;

    const where = {
      paymentMethod: 'mobile'
    };

    if (startDate) {
      where.createdAt = { [require('sequelize').Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        [require('sequelize').Op.lte]: new Date(endDate)
      };
    }
    if (walletType) {
      where.walletType = walletType;
    }
    if (status) {
      where.status = status;
    }

    const { count, rows } = await PaymentTransaction.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
      attributes: [
        'transactionId',
        'saleNumber',
        'amount',
        'walletType',
        'phoneNumber',
        'status',
        'transactionType',
        'createdAt'
      ]
    });

    return {
      transactions: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Cancel mobile payment session
   */
  static async cancelMobilePayment(qrId, reason, userId) {
    const session = await MobilePaymentSession.findOne({ where: { qrId } });

    if (!session) {
      throw new Error('Mobile payment session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Cannot cancel completed payment. Please process a refund instead.');
    }

    if (session.status === 'cancelled') {
      throw new Error('Payment session already cancelled');
    }

    // Call gateway to cancel if needed
    if (session.gatewayPaymentId) {
      await this.callMobileWalletGateway('/cancel', {
        paymentId: session.gatewayPaymentId
      });
    }

    // Update session
    await session.update({
      status: 'cancelled',
      failureReason: reason,
      cancelledAt: new Date()
    });

    return {
      qrId: session.qrId,
      status: 'cancelled',
      cancelledAt: session.cancelledAt
    };
  }

  /**
   * Mask phone number for privacy
   */
  static maskPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 4) return phoneNumber;
    return cleaned.slice(0, 3) + '***' + cleaned.slice(-2);
  }
}

module.exports = MobilePaymentService;
