require('dotenv').config();
const { MenuItem, KitchenStation, sequelize } = require('../models');
const { connectDB } = require('../config/database');

async function assignMenuItemsToKitchens() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('\n📋 Fetching menu items and kitchen stations...');
    
    const menuItems = await MenuItem.findAll();
    const stations = await KitchenStation.findAll({ where: { isActive: true } });

    console.log(`Found ${menuItems.length} menu items`);
    console.log(`Found ${stations.length} kitchen stations\n`);

    if (stations.length === 0) {
      console.log('❌ No kitchen stations found. Please run add-kitchen-stations.js first.');
      process.exit(1);
    }

    console.log('Available Kitchen Stations:');
    stations.forEach(station => {
      console.log(`  ${station.id}. ${station.name} (${station.code}) - ${station.productCategories.join(', ')}`);
    });

    console.log('\n🔄 Auto-assigning menu items based on categories...\n');

    let assignedCount = 0;
    let alreadyAssigned = 0;
    let unassigned = 0;

    for (const item of menuItems) {
      // Skip if already assigned
      if (item.kitchenStationId) {
        console.log(`⏭  ${item.name} - Already assigned to station ${item.kitchenStationId}`);
        alreadyAssigned++;
        continue;
      }

      let matchingStation = null;

      // Match based on category keywords
      const category = item.category?.toLowerCase() || '';
      const name = item.name.toLowerCase();

      // Beverage matching
      if (category.includes('beverage') || category.includes('drink') || 
          name.includes('cola') || name.includes('juice') || name.includes('tea') || 
          name.includes('coffee') || name.includes('water')) {
        matchingStation = stations.find(s => s.code === 'BEV');
      }
      // Dessert matching
      else if (category.includes('dessert') || category.includes('sweet') || 
               name.includes('cake') || name.includes('ice cream') || name.includes('tiramisu')) {
        matchingStation = stations.find(s => s.code === 'DESS');
      }
      // Grilled items
      else if (category.includes('grill') || category.includes('bbq') || 
               name.includes('grilled') || name.includes('bbq')) {
        matchingStation = stations.find(s => s.code === 'GRILL');
      }
      // Salads and cold items
      else if (category.includes('salad') || category.includes('cold') || 
               name.includes('salad')) {
        matchingStation = stations.find(s => s.code === 'COLD');
      }
      // Main kitchen for everything else (rice, curry, kottu, etc.)
      else {
        matchingStation = stations.find(s => s.code === 'MAIN');
      }

      if (!matchingStation) {
        matchingStation = stations.find(s => s.code === 'MAIN') || stations[0];
      }

      await item.update({ kitchenStationId: matchingStation.id });
      console.log(`✓ ${item.name} → ${matchingStation.name} (${matchingStation.code})`);
      assignedCount++;
    }

    console.log('\n✅ Menu item assignment completed!');
    console.log(`\nSummary:`);
    console.log(`  ✓ Newly assigned: ${assignedCount}`);
    console.log(`  ⏭  Already assigned: ${alreadyAssigned}`);
    console.log(`  ⚠ Assigned to default: ${unassigned}`);
    console.log(`  📊 Total items: ${menuItems.length}\n`);

    // Show assignment by station
    console.log('Assignment by Kitchen Station:');
    for (const station of stations) {
      const count = await MenuItem.count({ where: { kitchenStationId: station.id } });
      console.log(`  ${station.name}: ${count} items`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error assigning menu items:', error);
    process.exit(1);
  }
}

assignMenuItemsToKitchens();
