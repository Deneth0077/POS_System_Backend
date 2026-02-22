const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BillSplit = sequelize.define('BillSplit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sales',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  splitNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Split number (1, 2, 3, etc.)'
  },
  customerName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Optional customer name for this split'
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Items included in this split'
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
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'mobile', 'other'),
    allowNull: true,
    comment: 'Payment method used for this split'
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  changeGiven: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paidBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Cashier who processed the payment'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'bill_splits',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'bill_splits_sale_id',
      fields: ['sale_id']
    },
    {
      name: 'bill_splits_payment_status',
      fields: ['payment_status']
    },
    {
      name: 'bill_splits_sale_split',
      fields: ['sale_id', 'split_number']
    }
  ]
});

module.exports = BillSplit;
