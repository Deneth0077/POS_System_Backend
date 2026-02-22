const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
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
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  barcode: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  costPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  taxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  unit: {
    type: DataTypes.STRING(50),
    defaultValue: 'piece'
  },
  reorderLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  kitchenStationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the kitchen station that prepares this item',
    references: {
      model: 'kitchen_stations',
      key: 'id'
    }
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    // Unique indexes
    { fields: ['sku'], unique: true },
    {
      fields: ['barcode'],
      unique: true,
      where: { barcode: { [sequelize.Sequelize.Op.ne]: null } }
    },

    // Single field indexes for search optimization
    { fields: ['name'] },           // Name search
    { fields: ['category'] },        // Category filtering
    { fields: ['isActive'] },        // Active status filtering

    // Composite indexes for optimized queries
    { fields: ['category', 'isActive'] },     // Category + active filter
    { fields: ['name', 'category'] },          // Name search within category
    { fields: ['isActive', 'category', 'name'] } // Common search pattern
  ]
});

module.exports = Product;
