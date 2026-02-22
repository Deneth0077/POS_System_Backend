const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR'),
        defaultValue: 'INFO',
        allowNull: false
    },
    // The role this notification is targeted at
    targetRole: {
        type: DataTypes.ENUM('Admin', 'Manager', 'Cashier', 'Kitchen Staff', 'All'),
        defaultValue: 'All',
        allowNull: false
    },
    // Optional: Specific user ID if personal
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'notifications',
    timestamps: true
});

module.exports = Notification;
