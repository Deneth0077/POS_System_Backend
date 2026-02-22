const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockTransferItem = sequelize.define('StockTransferItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transferId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'transfer_id',
    references: {
      model: 'stock_transfers',
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
  quantitySent: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    field: 'quantity_sent'
  },
  quantityReceived: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    field: 'quantity_received'
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
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'total_cost'
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'batch_number'
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'expiry_date'
  },
  damagedQuantity: {
    type: DataTypes.DECIMAL(10, 3),
    defaultValue: 0,
    field: 'damaged_quantity'
  },
  damageReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'damage_reason'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  stockTransactionOutId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'stock_transaction_out_id',
    references: {
      model: 'stock_transactions',
      key: 'id'
    }
  },
  stockTransactionInId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'stock_transaction_in_id',
    references: {
      model: 'stock_transactions',
      key: 'id'
    }
  }
}, {
  tableName: 'stock_transfer_items',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['transfer_id'] },
    { fields: ['ingredient_id'] }
  ]
});

module.exports = StockTransferItem;
