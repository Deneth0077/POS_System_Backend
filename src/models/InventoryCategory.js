const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryCategory = sequelize.define('InventoryCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    },
    comment: 'Short code for the category (e.g., VEG, FRT, SPC)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Icon identifier for UI'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: 'Hex color code for display purposes'
  },
  parentCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'parent_category_id',
    comment: 'For sub-categories'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'inventory_categories',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['parent_category_id'] },
    { fields: ['is_active'] },
    { fields: ['code'] }
  ]
});

// Self-referencing relationship for parent categories
InventoryCategory.belongsTo(InventoryCategory, {
  as: 'parentCategory',
  foreignKey: 'parentCategoryId'
});

InventoryCategory.hasMany(InventoryCategory, {
  as: 'subCategories',
  foreignKey: 'parentCategoryId'
});

module.exports = InventoryCategory;
