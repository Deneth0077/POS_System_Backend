require('dotenv').config();
const { sequelize } = require('../config/database');

async function fixSchema() {
  try {
    console.log('🔧 Fixing kitchen_orders schema...\n');
    
    // Step 1: Make saleId nullable
    console.log('Step 1: Making saleId nullable...');
    await sequelize.query('ALTER TABLE kitchen_orders MODIFY COLUMN saleId INT NULL COMMENT "Linked sale ID (null if payment not yet completed)"');
    console.log('✅ saleId is now nullable\n');
    
    // Step 2: Drop and recreate foreign key
    console.log('Step 2: Updating foreign key constraint...');
    try {
      await sequelize.query('ALTER TABLE kitchen_orders DROP FOREIGN KEY kitchen_orders_ibfk_1');
      console.log('   Dropped old foreign key');
    } catch (e) {
      console.log('   Foreign key already dropped or does not exist');
    }
    
    await sequelize.query(`
      ALTER TABLE kitchen_orders 
      ADD CONSTRAINT kitchen_orders_ibfk_1 
      FOREIGN KEY (saleId) 
      REFERENCES sales(id) 
      ON UPDATE CASCADE 
      ON DELETE SET NULL
    `);
    console.log('✅ Foreign key constraint updated\n');
    
    // Step 3: Add tableId column
    console.log('Step 3: Adding tableId column...');
    try {
      await sequelize.query('ALTER TABLE kitchen_orders ADD COLUMN tableId INT NULL COMMENT "Table ID reference for dine-in orders" AFTER tableNumber');
      console.log('✅ tableId column added\n');
    } catch (e) {
      if (e.original?.errno === 1060) {
        console.log('⏭️  tableId column already exists\n');
      } else {
        throw e;
      }
    }
    
    console.log('🎉 Schema fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixSchema();
