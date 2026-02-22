require('dotenv').config();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addStatusFields() {
  try {
    console.log('🔄 Starting migration: Adding status management fields...\n');

    // Add fields to Sales table
    console.log('📋 Adding fields to Sales table...');
    
    const salesFields = [
      {
        name: 'cancellationReason',
        sql: "ALTER TABLE sales ADD COLUMN cancellationReason VARCHAR(500) NULL COMMENT 'Reason for order cancellation if voided'"
      },
      {
        name: 'cancellationNote',
        sql: "ALTER TABLE sales ADD COLUMN cancellationNote TEXT NULL COMMENT 'Additional notes for cancellation'"
      },
      {
        name: 'completionReason',
        sql: "ALTER TABLE sales ADD COLUMN completionReason VARCHAR(500) NULL COMMENT 'Reason or notes for order completion'"
      },
      {
        name: 'statusUpdatedBy',
        sql: "ALTER TABLE sales ADD COLUMN statusUpdatedBy INT NULL COMMENT 'User who last updated the order status'"
      },
      {
        name: 'statusUpdatedAt',
        sql: "ALTER TABLE sales ADD COLUMN statusUpdatedAt DATETIME NULL COMMENT 'Timestamp of last status update'"
      }
    ];

    for (const field of salesFields) {
      try {
        // Check if column exists
        const columnCheck = await sequelize.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'sales' 
           AND COLUMN_NAME = :columnName`,
          {
            replacements: { columnName: field.name },
            type: QueryTypes.SELECT
          }
        );

        if (columnCheck.length === 0) {
          await sequelize.query(field.sql);
          console.log(`✅ Added ${field.name} to sales table`);
        } else {
          console.log(`ℹ️  ${field.name} already exists in sales table`);
        }
      } catch (err) {
        console.error(`❌ Error adding ${field.name} to sales:`, err.message);
      }
    }

    // Add fields to KitchenOrders table
    console.log('\n📋 Adding fields to KitchenOrders table...');
    
    const kitchenFields = [
      {
        name: 'cancellationReason',
        sql: "ALTER TABLE kitchen_orders ADD COLUMN cancellationReason VARCHAR(500) NULL COMMENT 'Reason for order cancellation'"
      },
      {
        name: 'cancellationNote',
        sql: "ALTER TABLE kitchen_orders ADD COLUMN cancellationNote TEXT NULL COMMENT 'Additional notes for cancellation'"
      },
      {
        name: 'completionReason',
        sql: "ALTER TABLE kitchen_orders ADD COLUMN completionReason VARCHAR(500) NULL COMMENT 'Reason or notes for order completion'"
      },
      {
        name: 'statusUpdatedBy',
        sql: "ALTER TABLE kitchen_orders ADD COLUMN statusUpdatedBy INT NULL COMMENT 'User who last updated the order status'"
      },
      {
        name: 'statusUpdatedAt',
        sql: "ALTER TABLE kitchen_orders ADD COLUMN statusUpdatedAt DATETIME NULL COMMENT 'Timestamp of last status update'"
      }
    ];

    for (const field of kitchenFields) {
      try {
        // Check if column exists
        const columnCheck = await sequelize.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'kitchen_orders' 
           AND COLUMN_NAME = :columnName`,
          {
            replacements: { columnName: field.name },
            type: QueryTypes.SELECT
          }
        );

        if (columnCheck.length === 0) {
          await sequelize.query(field.sql);
          console.log(`✅ Added ${field.name} to kitchen_orders table`);
        } else {
          console.log(`ℹ️  ${field.name} already exists in kitchen_orders table`);
        }
      } catch (err) {
        console.error(`❌ Error adding ${field.name} to kitchen_orders:`, err.message);
      }
    }

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
addStatusFields();
