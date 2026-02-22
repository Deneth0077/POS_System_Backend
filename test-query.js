require('dotenv').config();
const { sequelize, StockTransaction } = require('./src/models');
const { Op } = require('sequelize');

async function testQuery() {
    try {
        const locationName = 'Pizza Station'; // Example from my earlier check
        const ingredientIds = [1, 2, 3]; // Example

        const stockResults = await StockTransaction.findAll({
            attributes: [
                'ingredientId',
                [sequelize.fn('SUM',
                    sequelize.literal('CASE WHEN to_location = ' + sequelize.escape(locationName) + ' THEN quantity ELSE -quantity END')
                ), 'locationStock']
            ],
            where: {
                ingredientId: { [Op.in]: ingredientIds },
                status: 'completed',
                [Op.or]: [{ toLocation: locationName }, { fromLocation: locationName }]
            },
            group: ['ingredientId']
        });

        console.log('Query results:', JSON.stringify(stockResults, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Query failed:', error);
        process.exit(1);
    }
}

testQuery();
