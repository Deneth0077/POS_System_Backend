const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PriceHistory = sequelize.define('PriceHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    resourceType: {
        type: DataTypes.ENUM('Product', 'MenuItem'),
        allowNull: false
    },
    resourceId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    itemName: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    oldPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    newPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    changedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    changedByName: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'price_histories',
    timestamps: true,
    updatedAt: false,
    indexes: [
        { fields: ['resourceType', 'resourceId'] },
        { fields: ['changedBy'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = PriceHistory;
