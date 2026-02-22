const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StockIssue = sequelize.define('StockIssue', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    issueNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Unique reference number e.g. SI-2024-001'
    },
    menuItemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'menu_item_id',
        references: {
            model: 'menu_items',
            key: 'id'
        },
        comment: 'The product being produced/planned'
    },
    portionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'portion_id',
        references: {
            model: 'menu_item_portions',
            key: 'id'
        },
        comment: 'Specific portion size if applicable'
    },
    plannedQuantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0.1
        },
        comment: 'Number of units to produce'
    },
    fromLocationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'from_location_id',
        references: {
            model: 'stock_locations',
            key: 'id'
        },
        comment: 'Source Location (e.g. Main Warehouse)'
    },
    toLocationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'to_location_id',
        references: {
            model: 'stock_locations',
            key: 'id'
        },
        comment: 'Target Location (e.g. Kitchen Inventory)'
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'rejected', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false
    },
    issueDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    requestedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'requested_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    confirmedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'confirmed_by',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'confirmed_at'
    }
}, {
    tableName: 'stock_issues',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['issueNumber'], unique: true },
        { fields: ['status'] },
        { fields: ['menu_item_id'] },
        { fields: ['from_location_id', 'to_location_id'] }
    ],
    hooks: {
        beforeCreate: async (issue, options) => {
            // Auto-generate ID if not present (simple logic, in prod use a robust generator)
            if (!issue.issueNumber) {
                const date = new Date();
                const year = date.getFullYear();
                const rand = Math.floor(1000 + Math.random() * 9000);
                issue.issueNumber = `SI-${year}-${rand}`;
            }
        }
    }
});

module.exports = StockIssue;
