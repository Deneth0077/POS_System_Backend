const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KitchenInventoryCategory = sequelize.define('KitchenInventoryCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  kitchenStationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'kitchen_station_id'
  },
  inventoryCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'inventory_category_id'
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'is_primary',
    comment: 'Is this the primary kitchen for this category'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Display priority'
  }
}, {
  tableName: 'kitchen_inventory_categories',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['kitchen_station_id'] },
    { fields: ['inventory_category_id'] },
    { 
      unique: true, 
      fields: ['kitchen_station_id', 'inventory_category_id'],
      name: 'unique_kitchen_category'
    }
  ]
});

module.exports = KitchenInventoryCategory;
