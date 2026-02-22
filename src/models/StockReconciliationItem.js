const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockReconciliationItem = sequelize.define('StockReconciliationItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reconciliationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reconciliation_id',
    references: {
      model: 'stock_reconciliations',
      key: 'id'
    }
  },
  ingredientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ingredient_id',
    references: {
      model: 'ingredients',
      key: 'id'
    }
  },
  systemStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    field: 'system_stock'
  },
  physicalStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    field: 'physical_stock'
  },
  difference: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'unit_cost'
  },
  valueDifference: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'value_difference'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'batch_number'
  },
  adjustmentMade: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'adjustment_made'
  },
  stockTransactionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'stock_transaction_id',
    references: {
      model: 'stock_transactions',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_reconciliation_items',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['reconciliation_id'] },
    { fields: ['ingredient_id'] },
    { fields: ['adjustment_made'] }
  ]
});

module.exports = StockReconciliationItem;
