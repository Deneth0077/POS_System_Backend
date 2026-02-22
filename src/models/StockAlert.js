const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockAlert = sequelize.define('StockAlert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ingredientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ingredients',
      key: 'id'
    }
  },
  alertType: {
    type: DataTypes.ENUM('low_stock', 'out_of_stock', 'expiring_soon', 'expired'),
    allowNull: false
  },
  currentStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  reorderLevel: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isAcknowledged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  acknowledgedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }

}, {
  tableName: 'stock_alerts',
  timestamps: true,
  indexes: [
    { fields: ['isResolved'] },
    { fields: ['severity'] }
  ]
});

module.exports = StockAlert;
