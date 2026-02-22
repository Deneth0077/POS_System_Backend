const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Ingredient, Sale, StockTransfer } = require('../src/models');

async function check() {
    try {
        const ingredients = await Ingredient.findAll({ attributes: ['name', 'currentStock', 'unit'] });
        console.log('--- Current Stock Levels ---');
        ingredients.forEach(i => console.log(`${i.name}: ${Number(i.currentStock).toFixed(3)} ${i.unit}`));

        const salesCount = await Sale.count();
        console.log(`\n--- Sales Count: ${salesCount} ---`);

        const transfers = await StockTransfer.count();
        console.log(`--- Transfers Count: ${transfers} ---`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
