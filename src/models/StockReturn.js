const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const StockReturn = sequelize.define('StockReturn', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  returnNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'return_number'
  },
  ingredientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ingredient_id',
    references: {
      model: 'ingredients',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  returnReason: {
    type: DataTypes.ENUM('defective', 'wrong_item', 'excess', 'expired', 'quality_issue', 'other'),
    allowNull: false,
    field: 'return_reason'
  },
  returnDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'return_description'
  },
  returnDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'return_date'
  },
  supplierName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'supplier_name'
  },
  supplierContact: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'supplier_contact'
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'unit_cost'
  },
  totalRefund: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'total_refund'
  },
  refundStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'refunded', 'rejected'),
    defaultValue: 'pending',
    field: 'refund_status'
  },
  refundDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'refund_date'
  },
  originalPurchaseReference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'original_purchase_reference'
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'batch_number'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'shipped', 'completed', 'rejected'),
    defaultValue: 'pending'
  },
  initiatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'initiated_by',
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
  stockTransactionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'stock_transaction_id',
    references: {
      model: 'stock_transactions',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_returns',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['return_number'] },
    { fields: ['ingredient_id'] },
    { fields: ['return_date'] },
    { fields: ['status'] },
    { fields: ['refund_status'] }
  ]
});

// Helper method to generate return number
StockReturn.generateReturnNumber = async function () {
  const year = new Date().getFullYear();
  const prefix = `RTN-${year}-`;

  const lastReturn = await this.findOne({
    where: {
      returnNumber: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['id', 'DESC']]
  });

  let nextNumber = 1;
  if (lastReturn) {
    const lastNumber = parseInt(lastReturn.returnNumber.split('-').pop());
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = StockReturn;
