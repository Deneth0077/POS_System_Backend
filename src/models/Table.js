const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Table = sequelize.define('Table', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tableNumber: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    field: 'table_number',
    validate: {
      notEmpty: { msg: 'Table number is required' }
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
    validate: {
      min: { args: [1], msg: 'Capacity must be at least 1' },
      max: { args: [20], msg: 'Capacity cannot exceed 20' }
    }
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance'),
    allowNull: false,
    defaultValue: 'available'
  },
  location: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Table location/section (e.g., Indoor, Outdoor, VIP)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the table'
  }
}, {
  tableName: 'tables',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'tables_table_number_unique',
      unique: true,
      fields: ['table_number']
    },
    {
      name: 'tables_status',
      fields: ['status']
    },
    {
      name: 'tables_is_active',
      fields: ['is_active']
    },
    {
      name: 'tables_location_status',
      fields: ['location', 'status']
    }
  ]
});

module.exports = Table;
