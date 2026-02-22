const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { sequelize, MenuItem, MenuItemIngredient, Ingredient, User, Sale, KitchenStation } = require('../src/models');
const ingredientService = require('../src/services/ingredientService');

async function verify() {
    try {
        const pizza = await MenuItem.findOne({
            where: { name: 'Cheese Pizza' }
        });

        if (!pizza) {
            console.log('❌ Cheese Pizza not found');
            return;
        }
        console.log(`✅ Found Pizza: ${pizza.name} (ID: ${pizza.id})`);

        const ingredients = await MenuItemIngredient.findAll({
            where: { menuItemId: pizza.id },
            include: [{ model: Ingredient, as: 'ingredient' }]
        });

        console.log(`📋 Recipe has ${ingredients.length} ingredients:`);
        ingredients.forEach(i => {
            console.log(`   - ${i.ingredient?.name}: ${i.quantity} ${i.unit}`);
        });

        if (ingredients.length === 0) {
            console.log('❌ Recipe is empty! This explains why deduction fails or does nothing.');
        }

        // Try Deduction
        const adminUser = await User.findOne({ where: { role: 'admin' } });
        const station = await KitchenStation.findOne();

        // Create a dummy sale
        const sale = await Sale.create({
            invoiceNumber: `TEST-${Date.now()}`,
            subTotal: 10,
            tax: 0,
            grandTotal: 10,
            paymentMethod: 'cash',
            paymentStatus: 'completed',
            cashierId: adminUser.id,
            kitchenStationId: station?.id
        });

        console.log('🧪 Attempting Deduction...');
        try {
            const result = await ingredientService.deductIngredientsForOrder(
                pizza.id,
                1,
                sale.id,
                adminUser.id
            );
            console.log('🔎 Deduction Result:', JSON.stringify(result, null, 2));
        } catch (err) {
            console.error('❌ Deduction Error:', err);
        }

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        process.exit();
    }
}

verify();
