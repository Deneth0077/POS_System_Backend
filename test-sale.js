require('dotenv').config();
const { Sale } = require('./src/models');

async function testSaleItems() {
    try {
        const sale = await Sale.findOne();
        if (sale) {
            console.log('Sale found:', sale.saleNumber);
            console.log('Items type:', typeof sale.items);
            console.log('Items content:', sale.items);
            if (Array.isArray(sale.items)) {
                console.log('Items is an array');
            } else {
                console.log('Items is NOT an array');
            }
        } else {
            console.log('No sales found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testSaleItems();
