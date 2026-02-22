/**
 * MobilePaymentSession Model
 * Tracks QR code and mobile wallet payment sessions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MobilePaymentSession = sequelize.define('MobilePaymentSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Basic Session Info
  qrId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique QR/payment session identifier'
  },
  
  // Sale Reference
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'sales',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  
  // Cashier Info
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
  
  // Payment Details
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'LKR'
  },
  
  // Mobile Wallet Info
  walletType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Mobile wallet provider (genie, frimi, payhere, etc.)'
  },
  
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Customer phone number (masked for privacy)'
  },
  
  // QR Code Data
  qrCode: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Base64 encoded QR code image'
  },
  
  qrData: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'QR code content/payload'
  },
  
  // Session Status
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  // Transaction References
  transactionRef: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Reference from mobile wallet provider'
  },
  
  gatewayPaymentId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Payment ID from gateway'
  },
  
  // Gateway Response
  gatewayResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Full response from mobile wallet gateway'
  },
  
  // Failure Details
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for payment failure'
  },
  
  // Additional Data
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional session metadata'
  },
  
  // Timing
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'QR code expiration time'
  },
  
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Payment completion timestamp'
  },
  
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
  
}, {
  tableName: 'mobile_payment_sessions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['qrId']
    },
    {
      fields: ['saleId']
    },
    {
      fields: ['cashierId']
    },
    {
      fields: ['walletType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['walletType', 'status']
    }
  ]
});

module.exports = MobilePaymentSession;
