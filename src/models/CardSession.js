const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CardSession = sequelize.define('CardSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sessionId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique session identifier'
  },
  paymentIntentId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Payment intent ID from gateway'
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
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  cardType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Card type hint (visa, mastercard, amex, etc.)'
  },
  cardBrand: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Actual card brand from gateway'
  },
  cardLast4: {
    type: DataTypes.STRING(4),
    allowNull: true,
    comment: 'Last 4 digits of card'
  },
  cardExpiryMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 12
    }
  },
  cardExpiryYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 2025
    }
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
  clientSecret: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Client secret for frontend SDK'
  },
  returnUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Return URL after payment'
  },
  gatewayResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Full gateway response'
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for failure if applicable'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Session expiration time'
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
  tableName: 'card_sessions',
  timestamps: true,
  indexes: [
    { fields: ['sessionId'], unique: true },
    { fields: ['paymentIntentId'] },
    { fields: ['saleId'] },
    { fields: ['status'] },
    { fields: ['cashierId'] },
    { fields: ['expiresAt'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = CardSession;
