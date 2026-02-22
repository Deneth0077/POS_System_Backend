const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KitchenOrder = sequelize.define('KitchenOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique kitchen order number'
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow null for orders created before payment
    references: {
      model: 'sales',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Linked sale ID (null if payment not yet completed)'
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of items with station routing information'
  },
  orderType: {
    type: DataTypes.ENUM('dine-in', 'takeaway', 'delivery'),
    defaultValue: 'takeaway',
    allowNull: false
  },
  tableNumber: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Table number for dine-in orders'
  },
  tableId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Table ID reference for dine-in orders'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
    allowNull: false,
    comment: 'Order priority level'
  },
  status: {
    type: DataTypes.ENUM('unpaid', 'pending', 'preparing', 'ready', 'completed', 'cancelled'),
    defaultValue: 'unpaid',
    allowNull: false,
    comment: 'Overall order status - unpaid: awaiting payment, pending: sent to kitchen, preparing: kitchen started, ready: ready for pickup, completed: finished, cancelled: cancelled'
  },
  estimatedTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated preparation time in minutes'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When preparation started'
  },
  readyAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When order was marked ready'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When order was completed/served'
  },
  specialInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Special preparation instructions'
  },
  customerName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Customer name for identification'
  },
  customerPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Customer phone number'
  },
  customerEmail: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Customer email address'
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Selected payment method (cash, card, etc.)'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Order subtotal before tax'
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Tax amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Total order amount including tax'
  },
  assignedStations: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of station IDs this order is routed to'
  },
  preparationNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes from kitchen staff during preparation'
  },
  cancellationReason: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Reason for order cancellation'
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
  },
  kitchenStationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Primary kitchen station processing this order',
    references: {
      model: 'kitchen_stations',
      key: 'id'
    }
  },
  isInventoryDeducted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'isInventoryDeducted',
    comment: 'Whether the ingredients for this order have been deducted from inventory'
  }
}, {
  tableName: 'kitchen_orders',
  timestamps: true,
  indexes: [
    { fields: ['orderNumber'], unique: true },
    { fields: ['saleId'] },
    { fields: ['status'] },
    { fields: ['orderType'] },
    { fields: ['priority'] },
    { fields: ['createdAt'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['kitchenStationId'] }
  ]
});

module.exports = KitchenOrder;
