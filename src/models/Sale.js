const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  saleNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  vatAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  vatRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.15
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'mobile', 'other'),
    defaultValue: 'cash'
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  changeGiven: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  cashierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cashierName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  saleDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  offlineId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  syncedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isSynced: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'preparing', 'ready', 'completed', 'refunded', 'voided'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tableId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tables',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  tableNumber: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Denormalized table number for quick reference'
  },
  orderType: {
    type: DataTypes.ENUM('dine-in', 'takeaway', 'delivery'),
    defaultValue: 'takeaway',
    allowNull: false
  },
  isSplit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indicates if the bill has been split'
  },
  splitCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when all splits have been paid'
  },
  kitchenStationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Kitchen station where order was placed from',
    references: {
      model: 'kitchen_stations',
      key: 'id'
    }
  },
  cancellationReason: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Reason for order cancellation if voided'
  },
  cancellationNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes for cancellation'
  },
  completionReason: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Reason or notes for order completion'
  },
  statusUpdatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who last updated the order status'
  },
  statusUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of last status update'
  }
}, {
  tableName: 'sales',
  timestamps: true,
  indexes: [
    { fields: ['saleDate'] },
    { fields: ['isSynced'] },
    { fields: ['cashierId'] },
    { fields: ['offlineId'], unique: true, where: { offlineId: { [sequelize.Sequelize.Op.ne]: null } } },
    { fields: ['tableId'] },
    { fields: ['orderType'] },
    { fields: ['tableId', 'status'] },
    { fields: ['isSplit'] },
    { fields: ['kitchenStationId'] }
  ]
});

module.exports = Sale;
