const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MenuItemPortion = sequelize.define('MenuItemPortion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  menuItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'menu_item_id',
    references: {
      model: 'menu_items',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    },
    comment: 'Portion name: Full, Half, Quarter, etc.'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  costPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'cost_price',
    validate: {
      min: 0
    }
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default',
    comment: 'Default portion when ordering'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'menu_item_portions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['menu_item_id'] },
    { fields: ['is_active'] },
    { fields: ['display_order'] }
  ]
});

module.exports = MenuItemPortion;
