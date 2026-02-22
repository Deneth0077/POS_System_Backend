require('dotenv').config();
const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running menu portions and ingredients migration...\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-menu-portions-and-ingredients.sql'),
      'utf8'
    );

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        await sequelize.query(statement);
        console.log('✅ Success\n');
      } catch (error) {
        if (error.original?.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.original?.code === 'ER_DUP_FIELDNAME') {
          console.log(`⏭️  Skipped (already exists)\n`);
        } else {
          console.error(`❌ Error: ${error.message}\n`);
        }
      }
    }

    console.log('✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
