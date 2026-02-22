const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const DamagedStock = sequelize.define('DamagedStock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  damageNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'damage_number'
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
  damageType: {
    type: DataTypes.ENUM('expired', 'spoiled', 'broken', 'contaminated', 'other'),
    allowNull: false,
    field: 'damage_type'
  },
  damageReason: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'damage_reason'
  },
  damageDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'damage_date'
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'unit_cost'
  },
  totalLoss: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'total_loss'
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
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reportedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reported_by',
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
  status: {
    type: DataTypes.ENUM('reported', 'approved', 'rejected', 'written_off'),
    defaultValue: 'reported'
  },
  disposalMethod: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'disposal_method'
  },
  disposalDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'disposal_date'
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
  tableName: 'damaged_stock',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['damage_number'] },
    { fields: ['ingredient_id'] },
    { fields: ['damage_date'] },
    { fields: ['damage_type'] },
    { fields: ['status'] }
  ]
});

// Helper method to generate damage number
DamagedStock.generateDamageNumber = async function () {
  const year = new Date().getFullYear();
  const prefix = `DMG-${year}-`;

  const lastDamage = await this.findOne({
    where: {
      damageNumber: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['id', 'DESC']]
  });

  let nextNumber = 1;
  if (lastDamage) {
    const lastNumber = parseInt(lastDamage.damageNumber.split('-').pop());
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

module.exports = DamagedStock;
