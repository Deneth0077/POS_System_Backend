const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KitchenStation = sequelize.define('KitchenStation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Station name (e.g., Grill, Fryer, Salad)'
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Short code for the station (e.g., GRL, FRY, SAL)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of what this station handles'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether the station is currently active'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Display priority (higher numbers shown first)'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: 'Hex color code for display purposes'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Icon identifier for UI'
  },
  averagePrepTime: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    allowNull: false,
    comment: 'Average preparation time in minutes'
  },
  productCategories: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of product categories handled by this station'
  },
  stockLocationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the stock location assigned to this kitchen',
    references: {
      model: 'stock_locations',
      key: 'id'
    }
  }
}, {
  tableName: 'kitchen_stations',
  timestamps: true,
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['name'], unique: true },
    { fields: ['isActive'] },
    { fields: ['priority'] }
  ]
});

module.exports = KitchenStation;
