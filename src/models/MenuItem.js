const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('starters', 'mains', 'desserts', 'beverages', 'sides', 'specials'),
    allowNull: false,
    defaultValue: 'mains'
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
    validate: {
      min: 0
    }
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  preparationTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Preparation time in minutes',
    validate: {
      min: 0
    }
  },
  calories: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  isVegetarian: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isVegan: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isGlutenFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  spicyLevel: {
    type: DataTypes.ENUM('none', 'mild', 'medium', 'hot', 'extra-hot'),
    defaultValue: 'none'
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  taxable: {
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
  },
  dailyTarget: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Daily production target quantity'
  }
}, {
  tableName: 'menu_items',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['isAvailable'] },
    { fields: ['isActive'] },
    { fields: ['kitchenStationId'] }
  ]
});

// Define associations separately to avoid circular dependency issues if possible, 
// or ensure they are loaded. For now, we assume index.js handles main associations.
// But we need to make sure 'ingredients' alias works in the service.

module.exports = MenuItem;
