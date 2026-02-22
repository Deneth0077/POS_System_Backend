require('dotenv').config();
const { sequelize } = require('../config/database');
const { connectDB } = require('../config/database');

async function addKitchenColumns() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('\n🔧 Adding kitchenStationId columns to tables...\n');

    // Add kitchenStationId to menu_items
    try {
      await sequelize.query(`
        ALTER TABLE menu_items 
        ADD COLUMN kitchenStationId INT NULL,
        ADD CONSTRAINT fk_menu_items_kitchen 
        FOREIGN KEY (kitchenStationId) 
        REFERENCES kitchen_stations(id) 
        ON DELETE SET NULL
      `);
      console.log('✓ Added kitchenStationId to menu_items table');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('⏭  menu_items.kitchenStationId already exists');
      } else {
        throw error;
      }
    }

    // Add kitchenStationId to kitchen_orders
    try {
      await sequelize.query(`
        ALTER TABLE kitchen_orders 
        ADD COLUMN kitchenStationId INT NULL,
        ADD CONSTRAINT fk_kitchen_orders_station 
        FOREIGN KEY (kitchenStationId) 
        REFERENCES kitchen_stations(id) 
        ON DELETE SET NULL
      `);
      console.log('✓ Added kitchenStationId to kitchen_orders table');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('⏭  kitchen_orders.kitchenStationId already exists');
      } else {
        throw error;
      }
    }

    // Add kitchenStationId to sales
    try {
      await sequelize.query(`
        ALTER TABLE sales 
        ADD COLUMN kitchenStationId INT NULL,
        ADD CONSTRAINT fk_sales_kitchen 
        FOREIGN KEY (kitchenStationId) 
        REFERENCES kitchen_stations(id) 
        ON DELETE SET NULL
      `);
      console.log('✓ Added kitchenStationId to sales table');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('⏭  sales.kitchenStationId already exists');
      } else {
        throw error;
      }
    }

    // Add indexes
    try {
      await sequelize.query('CREATE INDEX idx_menu_items_kitchen ON menu_items(kitchenStationId)');
      console.log('✓ Added index on menu_items.kitchenStationId');
    } catch (error) {
      if (error.message.includes('Duplicate key')) {
        console.log('⏭  Index idx_menu_items_kitchen already exists');
      } else {
        console.log('Note: Index creation skipped -', error.message);
      }
    }

    try {
      await sequelize.query('CREATE INDEX idx_kitchen_orders_station ON kitchen_orders(kitchenStationId)');
      console.log('✓ Added index on kitchen_orders.kitchenStationId');
    } catch (error) {
      if (error.message.includes('Duplicate key')) {
        console.log('⏭  Index idx_kitchen_orders_station already exists');
      } else {
        console.log('Note: Index creation skipped -', error.message);
      }
    }

    try {
      await sequelize.query('CREATE INDEX idx_sales_kitchen ON sales(kitchenStationId)');
      console.log('✓ Added index on sales.kitchenStationId');
    } catch (error) {
      if (error.message.includes('Duplicate key')) {
        console.log('⏭  Index idx_sales_kitchen already exists');
      } else {
        console.log('Note: Index creation skipped -', error.message);
      }
    }

    console.log('\n✅ Database migration completed successfully!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addKitchenColumns();
