require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function findForeignKeys() {
    try {
        const [results] = await sequelize.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE 
        REFERENCED_TABLE_NAME = 'ingredients'
        AND TABLE_SCHEMA = DATABASE();
    `);

        console.log('Foreign Keys pointing to ingredients table:');
        console.table(results);

        process.exit(0);
    } catch (error) {
        console.error('Error finding foreign keys:', error);
        process.exit(1);
    }
}

findForeignKeys();
