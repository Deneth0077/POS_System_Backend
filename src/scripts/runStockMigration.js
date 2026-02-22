require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

async function runStockMigration() {
  try {
    console.log('Starting stock management migration...');
    
    // Read the SQL file
    const migrationPath = path.join(__dirname, '../../migrations/create-stock-management-tables.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comments
    const cleanedSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    console.log('Executing migration SQL...');
    
    // Execute the entire SQL content
    await sequelize.query(cleanedSql, { multipleStatements: true });
    
    console.log('\n✓ Stock management migration completed successfully!');
    console.log('The following tables should now be available:');
    console.log('  - stock_transactions');
    console.log('  - stock_transfers');
    console.log('  - stock_transfer_items');
    console.log('  - damaged_stock');
    console.log('  - stock_returns');
    console.log('  - stock_locations');
    console.log('  - stock_reconciliations');
    console.log('  - stock_reconciliation_items');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runStockMigration();
