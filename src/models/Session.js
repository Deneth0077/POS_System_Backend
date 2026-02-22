const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    token: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    deviceInfo: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    lastActivity: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'sessions',
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['isActive'] }
    ]
});

// Define association in a separate way to avoid circular dependencies if needed, 
// but for simple cases we can do it here or in a central models file.
// Session.belongsTo(User, { foreignKey: 'userId' });

module.exports = Session;
