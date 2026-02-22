const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentTransaction = sequelize.define('PaymentTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique transaction identifier'
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'sales',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  saleNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Denormalized sale number for quick reference'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'mobile', 'other'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'LKR',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  transactionType: {
    type: DataTypes.ENUM('payment', 'refund', 'void'),
    defaultValue: 'payment',
    allowNull: false
  },
  cashierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cashierName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  cashDrawerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'cash_drawers',
      key: 'id'
    },
    comment: 'Associated cash drawer for cash payments'
  },
  // Cash-specific fields
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Amount paid (for cash transactions)'
  },
  changeGiven: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Change given (for cash transactions)'
  },
  denominations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Cash denomination breakdown'
  },
  // Card-specific fields
  cardBrand: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Card brand (Visa, Mastercard, etc.)'
  },
  cardLast4: {
    type: DataTypes.STRING(4),
    allowNull: true,
    comment: 'Last 4 digits of card'
  },
  authorizationCode: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Card authorization code'
  },
  // Mobile wallet-specific fields
  walletType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Mobile wallet type (genie, frimi, etc.)'
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Masked phone number for mobile payments'
  },
  qrId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'QR code reference for mobile payments'
  },
  // Gateway fields
  gatewayResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Full gateway response for card/mobile payments'
  },
  gatewayTransactionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Transaction ID from payment gateway'
  },
  // Refund fields
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refundedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Manager/Admin who approved refund'
  },
  // Metadata
  receiptNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Receipt reference number'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'payment_transactions',
  timestamps: true,
  indexes: [
    { fields: ['transactionId'], unique: true },
    { fields: ['saleId'] },
    { fields: ['paymentMethod'] },
    { fields: ['status'] },
    { fields: ['cashierId'] },
    { fields: ['cashDrawerId'] },
    { fields: ['transactionType'] },
    { fields: ['createdAt'] },
    { fields: ['paymentMethod', 'status'] }
  ]
});

module.exports = PaymentTransaction;
