require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkPriceHistColumns() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query('DESCRIBE price_histories');
        console.log('Columns in price_histories:', results);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPriceHistColumns();
