const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Receipt = sequelize.define('Receipt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  receiptNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique receipt identifier'
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sales',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  receiptType: {
    type: DataTypes.ENUM('original', 'duplicate', 'refund', 'digital'),
    defaultValue: 'original',
    allowNull: false,
    comment: 'Type of receipt generated'
  },
  format: {
    type: DataTypes.ENUM('print', 'email', 'sms', 'pdf'),
    allowNull: false,
    comment: 'Format in which receipt was generated'
  },
  language: {
    type: DataTypes.ENUM('english', 'sinhala', 'tamil'),
    defaultValue: 'english',
    allowNull: false,
    comment: 'Language of the receipt'
  },
  orderType: {
    type: DataTypes.ENUM('dine-in', 'takeaway', 'delivery'),
    allowNull: false,
    comment: 'Denormalized order type from sale'
  },
  templateVersion: {
    type: DataTypes.STRING(20),
    defaultValue: '1.0',
    comment: 'Version of template used for receipt generation'
  },
  receiptData: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Complete receipt data snapshot for audit purposes'
  },
  deliveryMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Email address, phone number, or printer ID'
  },
  deliveryStatus: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed', 'printed'),
    defaultValue: 'pending',
    allowNull: false
  },
  deliveryAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of delivery attempts'
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when receipt was successfully delivered'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if delivery failed'
  },
  generatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who generated the receipt'
  },
  generatedByName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Denormalized user name for audit'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address from which receipt was generated'
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'User agent string for audit'
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL or path to stored receipt file (PDF/image)'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata (printer settings, email subject, etc.)'
  },
  isVoided: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this receipt has been voided'
  },
  voidedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  voidedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  voidReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'receipts',
  timestamps: true,
  indexes: [
    { fields: ['receiptNumber'], unique: true },
    { fields: ['saleId'] },
    { fields: ['receiptType'] },
    { fields: ['format'] },
    { fields: ['language'] },
    { fields: ['orderType'] },
    { fields: ['deliveryStatus'] },
    { fields: ['generatedBy'] },
    { fields: ['createdAt'] },
    { fields: ['isVoided'] },
    { fields: ['saleId', 'receiptType'] }
  ]
});

module.exports = Receipt;
