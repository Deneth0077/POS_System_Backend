require('dotenv').config();
const { sequelize } = require('../config/database');
const { Sale, KitchenOrder } = require('../models');
const kitchenService = require('../services/kitchenService');

async function createMissingKitchenOrders() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Find all sales without kitchen orders
    console.log('\nSearching for sales without kitchen orders...');
    const salesWithoutKitchenOrders = await Sale.findAll({
      where: {
        status: 'pending'
      },
      include: [{
        model: KitchenOrder,
        as: 'kitchenOrder',
        required: false
      }]
    });

    console.log(`Found ${salesWithoutKitchenOrders.length} pending sales`);

    let created = 0;
    let failed = 0;

    for (const sale of salesWithoutKitchenOrders) {
      // Check if kitchen order already exists
      if (sale.kitchenOrder) {
        console.log(`  - Sale ${sale.saleNumber}: Already has kitchen order`);
        continue;
      }

      try {
        console.log(`\n  Creating kitchen order for sale ${sale.saleNumber}...`);
        console.log(`    Items:`, JSON.stringify(sale.items, null, 2));
        
        const kitchenOrder = await kitchenService.createKitchenOrder({
          saleId: sale.id,
          items: sale.items,
          orderType: sale.orderType || 'takeaway',
          tableNumber: sale.tableNumber,
          priority: 'normal',
          specialInstructions: null,
          customerName: null
        });

        // Update sale status
        await sale.update({ status: 'preparing' });

        console.log(`  ✓ Kitchen order created: ${kitchenOrder.orderNumber}`);
        created++;
      } catch (error) {
        console.error(`  ✗ Failed to create kitchen order for sale ${sale.saleNumber}:`, error.message);
        failed++;
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total pending sales: ${salesWithoutKitchenOrders.length}`);
    console.log(`Kitchen orders created: ${created}`);
    console.log(`Failed: ${failed}`);

    // Show all kitchen orders
    console.log('\n=== ALL KITCHEN ORDERS ===');
    const allKitchenOrders = await KitchenOrder.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    console.log(`Total kitchen orders in database: ${allKitchenOrders.length}`);
    allKitchenOrders.forEach(ko => {
      console.log(`  - ${ko.orderNumber} (Sale ID: ${ko.saleId}) - Status: ${ko.status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

createMissingKitchenOrders();
