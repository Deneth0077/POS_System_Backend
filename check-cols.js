require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkStockAlertColumns() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query('DESCRIBE stock_alerts');
        results.forEach(col => console.log(col.Field));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkStockAlertColumns();
