const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    resourceType: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    resourceId: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false, // Audit logs are immutable
    indexes: [
        { fields: ['userId'] },
        { fields: ['action'] },
        { fields: ['resourceType'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = AuditLog;
