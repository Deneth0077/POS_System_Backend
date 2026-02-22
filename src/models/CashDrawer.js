const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CashDrawer = sequelize.define('CashDrawer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cashierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  cashierName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Denormalized cashier name for quick reference'
  },
  openingBalance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  closingBalance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  actualCash: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Physical cash counted at closing'
  },
  expectedBalance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Expected balance based on transactions'
  },
  variance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Difference between expected and actual (actualCash - expectedBalance)'
  },
  totalCashIn: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total cash received during shift'
  },
  totalCashOut: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total cash paid out (refunds, change) during shift'
  },
  totalSales: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Number of cash sales during shift'
  },
  totalRefunds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Number of refunds during shift'
  },
  openingDenominations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Breakdown of opening cash by denomination'
  },
  closingDenominations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Breakdown of closing cash by denomination'
  },
  status: {
    type: DataTypes.ENUM('open', 'closed', 'reconciled'),
    defaultValue: 'open',
    allowNull: false
  },
  openedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reconciledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reconciledBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Manager/Admin who reconciled the drawer'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'cash_drawers',
  timestamps: true,
  indexes: [
    { fields: ['cashierId'] },
    { fields: ['status'] },
    { fields: ['openedAt'] },
    { fields: ['cashierId', 'status'] }
  ]
});

module.exports = CashDrawer;
