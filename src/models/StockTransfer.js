const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const StockTransfer = sequelize.define('StockTransfer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transferNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'transfer_number'
  },
  fromLocation: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'from_location'
  },
  toLocation: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'to_location'
  },
  transferDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'transfer_date'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_transit', 'received', 'rejected', 'cancelled'),
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
  receivedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'received_by',
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
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  initiatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'initiated_at'
  },
  receivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'received_at'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  }
}, {
  tableName: 'stock_transfers',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['transfer_number'] },
    { fields: ['status'] },
    { fields: ['from_location'] },
    { fields: ['to_location'] },
    { fields: ['transfer_date'] }
  ]
});

// Helper method to generate transfer number
StockTransfer.generateTransferNumber = async function () {
  const year = new Date().getFullYear();
  const prefix = `TRF-${year}-`;

  const lastTransfer = await this.findOne({
    where: {
      transferNumber: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['id', 'DESC']]
  });

  let nextNumber = 1;
  if (lastTransfer) {
    const lastNumber = parseInt(lastTransfer.transferNumber.split('-').pop());
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = StockTransfer;
