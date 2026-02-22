require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkColumns() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query('DESCRIBE stock_alerts');
        console.log('Columns in stock_alerts:', results);

        const [results2] = await sequelize.query('SHOW TABLES LIKE "expenses"');
        console.log('Is expenses table present?', results2);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
