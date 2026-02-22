require('dotenv').config();
const { sequelize } = require('../config/database');

async function addUnpaidStatus() {
    try {
        console.log('🔧 Adding unpaid status to kitchen_orders...\n');

        // Get current enum values
        console.log('Step 1: Checking current enum values...');
        const [results] = await sequelize.query(`
            SHOW COLUMNS FROM kitchen_orders LIKE 'status'
        `);
        console.log('Current status column:', results[0]);

        // Modify enum to add 'unpaid' as first value
        console.log('\nStep 2: Adding unpaid to status enum...');
        await sequelize.query(`
            ALTER TABLE kitchen_orders 
            MODIFY COLUMN status 
            ENUM('unpaid', 'pending', 'preparing', 'ready', 'completed', 'cancelled') 
            DEFAULT 'unpaid' 
            NOT NULL 
            COMMENT 'Overall order status - unpaid: awaiting payment, pending: sent to kitchen, preparing: kitchen started, ready: ready for pickup, completed: finished, cancelled: cancelled'
        `);
        console.log('✅ Added unpaid status to enum');

        // Verify the change
        console.log('\nStep 3: Verifying changes...');
        const [verifyResults] = await sequelize.query(`
            SHOW COLUMNS FROM kitchen_orders LIKE 'status'
        `);
        console.log('Updated status column:', verifyResults[0]);

        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

addUnpaidStatus();
