require('dotenv').config();
const { KitchenStation } = require('../models');
const { connectDB } = require('../config/database');

async function addKitchenStations() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Creating kitchen stations...');

    const stations = [
      {
        name: 'Main Kitchen',
        code: 'MAIN',
        description: 'Primary kitchen for hot meals and main dishes',
        isActive: true,
        priority: 5,
        color: '#3b82f6',
        icon: 'chef-hat',
        averagePrepTime: 15,
        productCategories: ['Rice', 'Curry', 'Noodles', 'Main Course']
      },
      {
        name: 'Grill Station',
        code: 'GRILL',
        description: 'Specialized station for grilled items',
        isActive: true,
        priority: 4,
        color: '#ef4444',
        icon: 'flame',
        averagePrepTime: 12,
        productCategories: ['Grilled Items', 'BBQ', 'Tandoor']
      },
      {
        name: 'Beverage Station',
        code: 'BEV',
        description: 'Station for drinks, juices, and beverages',
        isActive: true,
        priority: 3,
        color: '#8b5cf6',
        icon: 'coffee',
        averagePrepTime: 5,
        productCategories: ['Beverages', 'Hot Drinks', 'Cold Drinks', 'Juices']
      },
      {
        name: 'Dessert Station',
        code: 'DESS',
        description: 'Station for desserts, cakes, and sweets',
        isActive: true,
        priority: 2,
        color: '#ec4899',
        icon: 'cake',
        averagePrepTime: 8,
        productCategories: ['Desserts', 'Sweets', 'Ice Cream']
      },
      {
        name: 'Salad & Cold Items',
        code: 'COLD',
        description: 'Station for salads and cold preparations',
        isActive: true,
        priority: 1,
        color: '#10b981',
        icon: 'salad',
        averagePrepTime: 5,
        productCategories: ['Salads', 'Cold Appetizers', 'Fresh Items']
      }
    ];

    for (const station of stations) {
      const [kitchenStation, created] = await KitchenStation.findOrCreate({
        where: { name: station.name },
        defaults: station
      });

      if (created) {
        console.log(`✓ Created: ${kitchenStation.name} (ID: ${kitchenStation.id})`);
      } else {
        console.log(`- Already exists: ${kitchenStation.name} (ID: ${kitchenStation.id})`);
      }
    }

    console.log('\n✅ Kitchen stations setup completed!');
    console.log('\nAvailable stations:');
    const allStations = await KitchenStation.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC']]
    });
    
    allStations.forEach(station => {
      console.log(`  ${station.id}. ${station.name} - ${station.description}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating kitchen stations:', error);
    process.exit(1);
  }
}

addKitchenStations();
