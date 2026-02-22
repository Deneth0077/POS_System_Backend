const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Ingredient, InventoryCategory } = require('../src/models');

async function report() {
    try {
        const categories = await InventoryCategory.findAll({ include: 'ingredients' });

        console.log('📦 STOCK REPORT BY CATEGORY');
        console.log('===========================');

        for (const cat of categories) {
            console.log(`\n📂 ${cat.name}`);
            if (cat.ingredients && cat.ingredients.length > 0) {
                cat.ingredients.forEach(ing => {
                    console.log(`   - ${ing.name}: ${Number(ing.currentStock).toFixed(3)} ${ing.unit}`);
                });
            } else {
                console.log('   (No ingredients)');
            }
        }
        console.log('\n===========================');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
report();
