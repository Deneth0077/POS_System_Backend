require('dotenv').config();
const { sequelize } = require('../config/database');

async function fixStatusColumn() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Check current status column definition
    const [results] = await sequelize.query(`SHOW COLUMNS FROM sales LIKE 'status'`);
    console.log('Current status column:', results);

    // Alter the column to add missing values
    console.log('Updating status column...');
    await sequelize.query(`
      ALTER TABLE sales 
      MODIFY COLUMN status ENUM('pending', 'preparing', 'ready', 'completed', 'refunded', 'voided') 
      DEFAULT 'pending'
    `);

    console.log('Status column updated successfully!');

    // Verify the change
    const [newResults] = await sequelize.query(`SHOW COLUMNS FROM sales LIKE 'status'`);
    console.log('New status column:', newResults);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixStatusColumn();
