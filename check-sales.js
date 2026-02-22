require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkSalesColumns() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query('DESCRIBE sales');
        console.log('Columns in sales:', results);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSalesColumns();
