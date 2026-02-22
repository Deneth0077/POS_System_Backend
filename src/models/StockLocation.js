const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockLocation = sequelize.define('StockLocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  locationCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'location_code'
  },
  locationName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'location_name'
  },
  locationType: {
    type: DataTypes.ENUM('warehouse', 'kitchen', 'store', 'refrigerator', 'freezer', 'dry_storage', 'other'),
    allowNull: false,
    field: 'location_type'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  capacity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  capacityUnit: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'capacity_unit'
  },
  managerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'manager_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  contactPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'contact_phone'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_locations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['location_code'] },
    { fields: ['location_type'] },
    { fields: ['is_active'] }
  ]
});

module.exports = StockLocation;
