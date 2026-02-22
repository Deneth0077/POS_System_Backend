const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Expense = sequelize.define('Expense', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'other'),
        defaultValue: 'cash'
    },
    recordedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    supplierName: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    receiptUrl: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'expenses',
    timestamps: true,
    indexes: [
        { fields: ['date'] },
        { fields: ['category'] },
        { fields: ['recordedBy'] }
    ]
});

module.exports = Expense;
