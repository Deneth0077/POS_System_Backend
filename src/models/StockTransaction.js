const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const StockTransaction = sequelize.define('StockTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'transaction_number'
  },
  transactionType: {
    type: DataTypes.ENUM(
      'add_stock',
      'adjustment',
      'transfer_out',
      'transfer_in',
      'damaged',
      'return_to_supplier',
      'sale_deduction',
      'usage',
      'opening_balance'
    ),
    allowNull: false,
    field: 'transaction_type'
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
    allowNull: false,
    comment: 'Positive for additions, negative for deductions'
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  previousStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    field: 'previous_stock'
  },
  newStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    field: 'new_stock'
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'unit_cost'
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'total_cost'
  },
  fromLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'from_location'
  },
  toLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'to_location'
  },
  storageLocation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'storage_location'
  },
  referenceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'reference_type'
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reference_id'
  },
  referenceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'reference_number'
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  batchNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'batch_number'
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'expiry_date'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
    defaultValue: 'completed'
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
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
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
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'transaction_date'
  }
}, {
  tableName: 'stock_transactions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['transaction_number'] },
    { fields: ['transaction_type'] },
    { fields: ['ingredient_id'] },
    { fields: ['transaction_date'] },
    { fields: ['status'] },
    { fields: ['reference_type', 'reference_id'] },
    { fields: ['batch_number'] },
    { fields: ['ingredient_id', 'transaction_date', 'transaction_type'] }
  ]
});

// Helper method to generate transaction number
StockTransaction.generateTransactionNumber = async function () {
  const year = new Date().getFullYear();
  const prefix = `ST-${year}-`;

  const lastTransaction = await this.findOne({
    where: {
      transactionNumber: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['id', 'DESC']]
  });

  let nextNumber = 1;
  if (lastTransaction) {
    const lastNumber = parseInt(lastTransaction.transactionNumber.split('-').pop());
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = StockTransaction;
