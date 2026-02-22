const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vihi_pos',
    multipleStatements: true
  });

  try {
    console.log('Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/create-inventory-categories.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('Running migration: create-inventory-categories.sql');

    // Execute the migration
    await connection.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\nCreated:');
    console.log('  - inventory_categories table');
    console.log('  - kitchen_inventory_categories table');
    console.log('  - Added categoryId and kitchenStationId to ingredients table');
    console.log('  - Inserted 20 default categories');
    console.log('  - Assigned categories to kitchen stations');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await connection.end();
    console.log('\nDatabase connection closed');
  }
}

runMigration();
