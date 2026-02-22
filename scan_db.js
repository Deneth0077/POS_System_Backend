require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function listTables() {
    try {
        const [results] = await sequelize.query("SHOW TABLES");
        console.log('Tables in database:');
        console.log(results);

        for (const row of results) {
            const tableName = Object.values(row)[0];
            const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`);
            const ingCol = columns.find(c => c.Field.toLowerCase().includes('ingredient'));
            if (ingCol) {
                console.log(`Table ${tableName} has column ${ingCol.Field}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listTables();
