require('dotenv').config();
const { MenuItem, MenuItemIngredient } = require('../models');
const { sequelize } = require('../config/database');

async function checkItem8() {
    try {
        const item = await MenuItem.findByPk(8);
        console.log('MenuItem 8:', item ? item.toJSON() : 'Not found');

        if (item) {
            const ingredients = await MenuItemIngredient.findAll({ where: { menuItemId: 8 } });
            console.log('Ingredients for Item 8:', ingredients.length);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkItem8();
