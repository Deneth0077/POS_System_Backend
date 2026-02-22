require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function checkTables() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query('SHOW TABLES');
        console.log('Tables in database:', results);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTables();
