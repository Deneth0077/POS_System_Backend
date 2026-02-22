require('dotenv').config();
const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running kitchen_orders migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'update-kitchen-orders-for-prepayment.sql'),
      'utf8'
    );
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SET'));
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      if (statement) {
        try {
          console.log(`Executing: ${statement.substring(0, 80)}...`);
          await sequelize.query(statement);
          successCount++;
        } catch (error) {
          // Skip if column already exists or other benign errors
          if (error.original?.errno === 1060 || error.original?.errno === 1061) {
            console.log(`⏭️  Skipped (already exists): ${statement.substring(0, 80)}...`);
            skipCount++;
          } else {
            console.error(`Error: ${error.message}`);
            // Continue with other statements
          }
        }
      }
    }
    
    console.log(`✅ Migration completed! Success: ${successCount}, Skipped: ${skipCount}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
