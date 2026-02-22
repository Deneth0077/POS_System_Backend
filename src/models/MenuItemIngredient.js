const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MenuItemIngredient = sequelize.define('MenuItemIngredient', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    menuItemId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'menu_item_id',
        references: {
            model: 'menu_items',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    portionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'portion_id',
        references: {
            model: 'menu_item_portions',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'product_id',
        references: {
            model: 'products',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    ingredientId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'ingredient_id',
        references: {
            model: 'ingredients',
            key: 'id'
        },
        onDelete: 'RESTRICT'
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'piece'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'menu_item_ingredients',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['portion_id'] },
        { fields: ['product_id'] },
        { fields: ['ingredient_id'] },
        { fields: ['menu_item_id'] },
        { fields: ['portion_id', 'product_id'] },
        { fields: ['portion_id', 'ingredient_id'] }
    ]
});

module.exports = MenuItemIngredient;
