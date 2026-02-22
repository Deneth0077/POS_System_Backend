const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const IngredientTransaction = sequelize.define('IngredientTransaction', {
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
  transactionType: {
    type: DataTypes.ENUM('purchase', 'usage', 'wastage', 'adjustment', 'return'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Positive for additions, negative for deductions'
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  previousStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  newStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  referenceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of reference: sale, menu_item, purchase_order, etc.'
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the related entity'
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Reason for wastage or adjustment'
  },
  performedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ingredient_transactions',
  timestamps: true,
  indexes: [
    { fields: ['transactionDate'] },
    { fields: ['transactionType'] }
  ]
});

module.exports = IngredientTransaction;
