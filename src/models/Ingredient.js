const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ingredient = sequelize.define('Ingredient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'kg',
    comment: 'Unit of measurement (kg, g, l, ml, pieces, etc.)'
  },
  currentStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  reorderLevel: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 10,
    validate: {
      min: 0
    },
    comment: 'Stock level at which to trigger reorder alert'
  },
  reorderQuantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 50,
    validate: {
      min: 0
    },
    comment: 'Suggested quantity to reorder'
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  supplier: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Legacy category field - use categoryId instead'
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'category_id',
    comment: 'Reference to inventory_categories table'
  },
  kitchenStationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'kitchen_station_id',
    comment: 'Primary kitchen station for this ingredient'
  },
  storageLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Where the ingredient is stored'
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ingredients',
  timestamps: true
});

// Virtual field to check if stock is low
Ingredient.prototype.isLowStock = function() {
  return this.currentStock <= this.reorderLevel;
};

// Virtual field to check if expired
Ingredient.prototype.isExpired = function() {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
};

module.exports = Ingredient;
