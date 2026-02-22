/**
 * Migration: Add kitchenStationId to products table
 * 
 * This script adds the kitchenStationId column to the products table
 * to support kitchen station assignment for products (similar to menu items).
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function migrate() {
  try {
    console.log('\n🔧 Adding kitchenStationId column to products table...\n');

    // Add kitchenStationId to products
    try {
      await sequelize.query(`
        ALTER TABLE products
        ADD COLUMN kitchenStationId INT NULL,
        ADD CONSTRAINT fk_products_kitchen_station
        FOREIGN KEY (kitchenStationId) 
        REFERENCES kitchen_stations(id) 
        ON DELETE SET NULL;
      `);
      console.log('✓ Added kitchenStationId to products table');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⏭  products.kitchenStationId already exists');
      } else {
        throw error;
      }
    }

    // Add index for better query performance
    try {
      await sequelize.query('CREATE INDEX idx_products_kitchen ON products(kitchenStationId)');
      console.log('✓ Created index on products.kitchenStationId');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('⏭  Index idx_products_kitchen already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrate();
