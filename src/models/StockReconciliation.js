const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const StockReconciliation = sequelize.define('StockReconciliation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reconciliationNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'reconciliation_number'
  },
  reconciliationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'reconciliation_date'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'approved', 'cancelled'),
    defaultValue: 'in_progress'
  },
  performedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'performed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  totalItemsCounted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_items_counted'
  },
  totalDiscrepancies: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_discrepancies'
  },
  totalValueDifference: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_value_difference'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  }
}, {
  tableName: 'stock_reconciliations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['reconciliation_number'] },
    { fields: ['reconciliation_date'] },
    { fields: ['status'] }
  ]
});

// Helper method to generate reconciliation number
StockReconciliation.generateReconciliationNumber = async function () {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  const lastReconciliation = await this.findOne({
    where: {
      reconciliationNumber: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['id', 'DESC']]
  });

  let nextNumber = 1;
  if (lastReconciliation) {
    const lastNumber = parseInt(lastReconciliation.reconciliationNumber.split('-').pop());
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = StockReconciliation;
